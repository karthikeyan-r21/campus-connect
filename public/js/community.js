document.addEventListener("DOMContentLoaded", () => {
  // Handle join/leave community
  document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("join-btn")) {
      try {
        const button = event.target;

        const communityId = button.dataset.communityId;
        const action = button.textContent.trim() === "Join" ? "join" : "leave";

        const response = await fetch(`/communities/${communityId}/${action}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error);
        }

        const updatedCommunity = await response.json();

        // Update button text and style after successful action
        if (action === "join") {
          button.textContent = "Exit";
          button.classList.remove("btn-outline-primary");
          button.classList.add("btn-outline-danger");
        } else {
          button.textContent = "Join";
          button.classList.remove("btn-outline-danger");
          button.classList.add("btn-outline-primary");
        }

        // Update the members count
        const membersCountElement = button
          .closest(".community-card")
          .querySelector(".text-muted small");
        membersCountElement.textContent = `Members: ${updatedCommunity.members.length}`;
      } catch (error) {
        console.error("Error:", error);
        alert("Failed to " + action + " community: " + error.message);
      }
    }
  });

  // Handle community creation
  const createForm = document.getElementById("createCommunityForm");
  if (createForm) {
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(createForm);

      try {
        const response = await fetch("/communities", {
          method: "POST",
          body: JSON.stringify(Object.fromEntries(formData)),
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error);
        }

        // Reload page after creating a community
        alert("Community created successfully!");
        location.reload();
      } catch (error) {
        console.error("Error:", error);
        alert("Failed to create community: " + error.message);
      }
    });
  }
  // Removed JS event handler for #createPostForm to prevent duplicate post creation

  // Handle dashboard-specific post creation
  const dashboardPostForm = document.getElementById("createPostFormDashboard");
  if (dashboardPostForm) {
    dashboardPostForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(dashboardPostForm);

      try {
        const response = await fetch("/posts", {
          method: "POST",
          body: JSON.stringify(Object.fromEntries(formData)),
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create post");
        }

        // Notify user and reload page to display the new post
        alert("Post created successfully!");
        location.reload();
      } catch (error) {
        console.error("Error:", error);
        alert("Failed to create post: " + error.message);
      }
    });
  }
});
