function deletePost(postId) {
  if (confirm("Are you sure you want to delete this post?")) {
    fetch(`/posts/delete-post/${postId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          // Remove the post element immediately
          const postElement = document.querySelector(
            `.post-card[data-post-id="${postId}"]`
          );
          if (postElement) {
            postElement.remove();
          }
        } else {
          throw new Error("Delete failed");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Failed to delete post");
      });
  }
}

// Add a global variable for current user ID (set this in your EJS template)
// window.CURRENT_USER_ID = '<%= user._id %>';

function renderComment(comment) {
  // Render replies if any
  let repliesHtml = '';
  if (comment.replies && comment.replies.length > 0) {
    repliesHtml = comment.replies.map(reply => {
      const replyUserName = reply.user && reply.user.name ? reply.user.name : 'User';
      return `<div class='d-flex align-items-start mb-2 p-2 rounded' style='background:#f8f9fa; border:1px solid #eee;'>
        <div class='me-2 d-flex align-items-center justify-content-center' style='width:28px;height:28px;background:#e9ecef;border-radius:50%;'><i class='fas fa-user text-secondary'></i></div>
        <div style='flex:1;'>
          <span class='fw-bold text-dark'>${replyUserName}</span>
          <span class='text-muted small ms-2'>${new Date(reply.createdAt).toLocaleString()}</span><br>
          <span class='text-dark'>${reply.text}</span>
        </div>
      </div>`;
    }).join('');
  }
  // Only show Edit button if current user is the comment author
  const canEdit = window.CURRENT_USER_ID && comment.user && comment.user._id && (comment.user._id === window.CURRENT_USER_ID);
  return `<div class='d-flex align-items-start mb-2 p-2 rounded' style='background:#fff; border:1px solid #eee;'>
    <div class='me-2 d-flex align-items-center justify-content-center' style='width:32px;height:32px;background:#e9ecef;border-radius:50%;'>
      <i class='fas fa-user text-secondary'></i>
    </div>
    <div style='flex:1;'>
      <span class='fw-bold text-dark'>${comment.user ? comment.user.name : "User"}</span>
      <span class='text-muted small ms-2'>${new Date(comment.createdAt).toLocaleString()}</span><br>
      <span class='text-dark'>${comment.text}</span>
      <div class='mt-1'>
        ${canEdit ? `<button class='btn btn-link btn-sm p-0 me-2 text-primary comment-edit-btn' data-comment-id='${comment._id || ''}'><i class='fas fa-pen'></i> Edit</button>` : ''}
        <button class='btn btn-link btn-sm p-0 me-2 text-danger comment-like-btn' data-comment-id='${comment._id || ''}'><i class='fas fa-heart'></i> Like <span class='comment-like-count'>${comment.likes ? comment.likes.length : 0}</span></button>
        <button class='btn btn-link btn-sm p-0 text-secondary comment-reply-btn' data-comment-id='${comment._id || ''}'><i class='fas fa-reply'></i> Reply</button>
      </div>
      <div class='comment-replies ms-4 mt-2'>${repliesHtml}</div>
    </div>
  </div>`;
}

// Event delegation for comment actions

document.addEventListener('click', function(e) {
  // Edit comment
  if (e.target.closest('.comment-edit-btn')) {
    const btn = e.target.closest('.comment-edit-btn');
    const commentDiv = btn.closest('.d-flex.align-items-start');
    const commentId = btn.getAttribute('data-comment-id');
    const postId = btn.closest('.comments-list').id.replace('comments-list-', '');
    const textSpan = commentDiv.querySelector('span.text-dark');
    const oldText = textSpan.textContent;
    // Replace text with textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'form-control mb-2';
    textarea.value = oldText;
    textSpan.replaceWith(textarea);
    btn.innerHTML = '<i class="fas fa-save"></i> Save';
    btn.classList.add('saving');
    setTimeout(() => textarea.focus(), 0); // Ensure focus after DOM update
    btn.onclick = function(ev) {
      ev.preventDefault();
      const newText = textarea.value.trim();
      if (!newText) return alert('Comment cannot be empty.');
      fetch(`/posts/${postId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const newSpan = document.createElement('span');
          newSpan.className = 'text-dark';
          newSpan.textContent = newText;
          textarea.replaceWith(newSpan);
          btn.innerHTML = '<i class="fas fa-pen"></i> Edit';
          btn.classList.remove('saving');
        } else {
          alert(data.message || 'Failed to edit comment');
        }
      });
    };
  }

  // Like/unlike comment
  if (e.target.closest('.comment-like-btn')) {
    const btn = e.target.closest('.comment-like-btn');
    const commentId = btn.getAttribute('data-comment-id');
    const postId = btn.closest('.comments-list').id.replace('comments-list-', '');
    fetch(`/posts/${postId}/comments/${commentId}/like`, { method: 'PATCH' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          btn.querySelector('.comment-like-count').textContent = data.likes;
        }
      });
  }

  // Reply to comment
  if (e.target.closest('.comment-reply-btn')) {
    const btn = e.target.closest('.comment-reply-btn');
    const commentDiv = btn.closest('.d-flex.align-items-start');
    const repliesDiv = commentDiv.querySelector('.comment-replies');
    // If reply form already exists, do nothing
    if (repliesDiv.querySelector('.reply-form')) return;
    const commentId = btn.getAttribute('data-comment-id');
    const postId = btn.closest('.comments-list').id.replace('comments-list-', '');
    // Create reply form
    const form = document.createElement('form');
    form.className = 'reply-form d-flex mt-2';
    form.innerHTML = `<textarea class='form-control me-2' rows='1' placeholder='Reply...' required style='resize:none;'></textarea><button type='submit' class='btn btn-secondary'><i class='fas fa-reply'></i></button>`;
    repliesDiv.appendChild(form);
    form.onsubmit = function(ev) {
      ev.preventDefault();
      const text = form.querySelector('textarea').value.trim();
      if (!text) return;
      fetch(`/posts/${postId}/comments/${commentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Render reply below
          const reply = data.reply;
          const replyDiv = document.createElement('div');
          replyDiv.className = 'd-flex align-items-start mb-2 p-2 rounded';
          replyDiv.style.background = '#f8f9fa';
          replyDiv.style.border = '1px solid #eee';
          replyDiv.innerHTML = `<div class='me-2 d-flex align-items-center justify-content-center' style='width:28px;height:28px;background:#e9ecef;border-radius:50%;'><i class='fas fa-user text-secondary'></i></div><div style='flex:1;'><span class='fw-bold text-dark'>${reply.user ? (reply.user.name || 'User') : 'User'}</span><span class='text-muted small ms-2'>${new Date(reply.createdAt).toLocaleString()}</span><br><span class='text-dark'>${reply.text}</span></div>`;
          repliesDiv.appendChild(replyDiv);
          form.remove();
        } else {
          alert(data.message || 'Failed to reply');
        }
      });
    };
  }
});
