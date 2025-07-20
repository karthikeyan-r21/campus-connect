document.addEventListener("DOMContentLoaded", function() {
  // Follow/Unfollow functionality
  const followBtns = document.querySelectorAll('.follow-btn');
  followBtns.forEach(followBtn => {
    followBtn.addEventListener('click', async function() {
      const userId = this.dataset.userId;
      try {
        const response = await fetch(`/profile/follow/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.action === 'followed') {
            this.innerHTML = '<i class="fas fa-user-minus"></i> Unfollow';
            this.classList.remove('btn-primary');
            this.classList.add('btn-danger');
          } else {
            this.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
            this.classList.remove('btn-danger');
            this.classList.add('btn-primary');
          }
          // Update all follower counts on the page
          const followerCountStats = document.querySelectorAll('.stat-item small.text-muted');
          followerCountStats.forEach((el) => {
            if (el.textContent.trim() === 'Followers') {
              // Find the h4 above this element and update its value
              const h4 = el.previousElementSibling;
              if (h4) {
                let count = parseInt(h4.textContent);
                h4.textContent = result.action === 'followed' ? count + 1 : count - 1;
              }
            }
          });
          // Update the followers section count in the card header
          const followersHeader = document.querySelectorAll('.card-header h5');
          followersHeader.forEach((el) => {
            if (el.textContent.trim().startsWith('Followers')) {
              let match = el.textContent.match(/Followers \((\d+)\)/);
              if (match) {
                let count = parseInt(match[1]);
                let newCount = result.action === 'followed' ? count + 1 : count - 1;
                el.textContent = `Followers (${newCount})`;
              }
            }
          });
        } else {
          const error = await response.json();
          alert('Error: ' + error.error);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to follow/unfollow user');
      }
    });
  });

  // Like/Unlike functionality
  const likeBtns = document.querySelectorAll('.like-btn');
  likeBtns.forEach(btn => {
    btn.addEventListener('click', async function() {
      const postId = this.dataset.postId;
      const heartIcon = this.querySelector('i');
      const likeCount = this.querySelector('.like-count');
      
      try {
        const response = await fetch(`/profile/like/${postId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          const currentCount = parseInt(likeCount.textContent);
          
          if (result.action === 'liked') {
            heartIcon.classList.remove('text-muted');
            heartIcon.classList.add('text-danger');
            likeCount.textContent = currentCount + 1;
          } else {
            heartIcon.classList.remove('text-danger');
            heartIcon.classList.add('text-muted');
            likeCount.textContent = currentCount - 1;
          }
        } else {
          const error = await response.json();
          alert('Error: ' + error.error);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to like/unlike post');
      }
    });
  });

  // Change Password functionality
  const savePasswordBtn = document.getElementById('savePasswordBtn');
  if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', async function() {
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Please fill in all fields');
        return;
      }

      if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
      }

      if (newPassword.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }

      try {
        const response = await fetch('/profile/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword
          }),
        });

        const result = await response.json();

        if (response.ok) {
          alert('Password changed successfully!');
          // Close modal and clear form
          const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
          modal.hide();
          document.getElementById('changePasswordForm').reset();
        } else {
          alert('Error: ' + result.error);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to change password');
      }
    });
  }

  // Add like buttons to dashboard posts if they exist
  const dashboardLikeBtns = document.querySelectorAll('.dashboard-like-btn');
  dashboardLikeBtns.forEach(btn => {
    btn.addEventListener('click', async function() {
      const postId = this.dataset.postId;
      const heartIcon = this.querySelector('i');
      const likeCount = this.querySelector('.like-count');
      
      try {
        const response = await fetch(`/profile/like/${postId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          const currentCount = parseInt(likeCount.textContent);
          
          if (result.action === 'liked') {
            heartIcon.classList.remove('text-muted');
            heartIcon.classList.add('text-danger');
            likeCount.textContent = currentCount + 1;
          } else {
            heartIcon.classList.remove('text-danger');
            heartIcon.classList.add('text-muted');
            likeCount.textContent = currentCount - 1;
          }
        } else {
          const error = await response.json();
          alert('Error: ' + error.error);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to like/unlike post');
      }
    });
  });
}); 