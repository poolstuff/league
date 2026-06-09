import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    where,
    getDocs
} from
    "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from
    "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";


// ====================================================
// Firebase
// ====================================================

const firebaseConfig = {
    apiKey: "AIzaSyDxvl6koOupJlj2zxbgHvshaR5io5VNx9Y",
    authDomain: "get-a-cue.firebaseapp.com",
    projectId: "get-a-cue",
    storageBucket: "get-a-cue.firebasestorage.app",
    messagingSenderId: "8027173859",
    appId: "1:8027173859:web:d7cce27102240b06a626d6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();


// ====================================================
// Scratchpad v3 Settings
// ====================================================

// Add any future admin emails to this array.
const ADMIN_EMAILS = [
    "pablodlc@gmail.com"
];

const BOARD_CATEGORIES = [
    "announcements",
    "general",
    "subs",
    "rules"
];

let currentUser = null;
let isAdmin = false;
let latestPostRecords = [];
let latestCommentRecords = [];


// ====================================================
// DOM Elements
// ====================================================

const modalOpenButtons = document.querySelectorAll("[data-modal-target]");
const modalCloseButtons = document.querySelectorAll("[data-modal-close]");
const modalPostForms = document.querySelectorAll(".modalPostForm");
const adminOnlyElements = document.querySelectorAll(".adminOnly");

const adminSignInButton = document.getElementById("adminSignInButton");
const adminSignOutButton = document.getElementById("adminSignOutButton");
const authStatus = document.getElementById("authStatus");

const boardContainers = {
    announcements: document.getElementById("announcementsPosts"),
    general: document.getElementById("generalPosts"),
    subs: document.getElementById("subsPosts"),
    rules: document.getElementById("rulesPosts")
};

const boardCountElements = document.querySelectorAll("[data-count-for]");


// ====================================================
// Helpers
// ====================================================

function formatTimestamp(timestamp) {
    if (!timestamp) return "Posting...";

    const date = timestamp.toDate();

    return date.toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function formatDateOnly(dateString) {
    if (!dateString) return "";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

function getInitials(name) {
    if (!name) return "?";

    return name
        .trim()
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function sortPostsForDisplay(posts) {
    return [...posts].sort((a, b) => {
        if (a.post.pinned !== b.post.pinned) {
            return a.post.pinned ? -1 : 1;
        }

        const aTime = a.post.createdAt?.toMillis?.() ?? 0;
        const bTime = b.post.createdAt?.toMillis?.() ?? 0;

        return bTime - aTime;
    });
}

function isCurrentUserAdmin(user) {
    return Boolean(
        user?.email &&
        ADMIN_EMAILS.includes(user.email.toLowerCase())
    );
}

function openModal(modal) {
    if (!modal) return;

    modal.classList.add("isOpen");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modalIsOpen");
}

function closeModal(modal) {
    if (!modal) return;

    modal.classList.remove("isOpen");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modalIsOpen");
}

function updateAdminControls() {
    adminOnlyElements.forEach((element) => {
        element.hidden = !isAdmin;
    });

    if (adminSignInButton) {
        adminSignInButton.hidden = Boolean(currentUser);
    }

    if (adminSignOutButton) {
        adminSignOutButton.hidden = !currentUser;
    }

    if (!authStatus) return;

    if (!currentUser) {
        authStatus.textContent = "Signed out";
        return;
    }

    authStatus.textContent = isAdmin
        ? `Signed in as admin: ${currentUser.email}`
        : `Signed in: ${currentUser.email}`;
}

function buildCommentsSection(postId) {
    return `
        <div
            class="commentsContainer"
            data-comments-for="${postId}"
            hidden
        >
            <form
                class="commentForm"
                data-post-id="${postId}"
            >
                <input
                    type="text"
                    class="commentName"
                    placeholder="Your Name"
                    required
                >

                <textarea
                    class="commentMessage"
                    placeholder="Write a comment..."
                    required
                ></textarea>

                <button type="submit">
                    Comment
                </button>
            </form>

            <div
                class="commentsList"
                data-comments-list="${postId}"
            ></div>
        </div>
    `;
}

function buildPostMenu(postId, pinned) {
    if (!isAdmin) return "";

    const pinText = pinned ? "Unpin post" : "Pin post";

    return `
        <div class="postMenuWrapper">
            <button
                class="postMenuButton"
                type="button"
                aria-label="Post options"
            >
                &hellip;
            </button>

            <div class="postMenu" hidden>
                <button
                    type="button"
                    data-post-action="toggle-pin"
                    data-post-id="${postId}"
                    data-pinned="${pinned ? "true" : "false"}"
                >
                    ${pinText}
                </button>

                <button
                    type="button"
                    class="dangerAction"
                    data-post-action="delete-post"
                    data-post-id="${postId}"
                >
                    Delete post
                </button>
            </div>
        </div>
    `;
}

function buildStandardPostCard(post, postId) {
    const safeName = escapeHTML(post.name);
    const safeMessage = escapeHTML(post.message);
    const initials = getInitials(post.name);
    const formattedDate = formatTimestamp(post.createdAt);
    const pinnedBadge = post.pinned
        ? `<span class="pinBadge">📌 Pinned</span>`
        : "";

    return `
        <div class="postCardHeader">
            <div class="postAvatar">
                ${initials}
            </div>

            <div class="postMeta">
                <span class="postAuthor">
                    ${safeName}
                </span>

                <span class="postTimestamp">
                    ${formattedDate}
                </span>

                ${pinnedBadge}
            </div>

            ${buildPostMenu(postId, Boolean(post.pinned))}
        </div>

        <p class="postMessage">
            ${safeMessage}
        </p>

        <div class="postActions">
            <button
                class="commentToggleButton"
                type="button"
                data-post-id="${postId}"
            >
                Comments (0)
            </button>
        </div>

        ${buildCommentsSection(postId)}
    `;
}

function buildSubPostCard(post, postId) {
    const safeName = escapeHTML(post.name);
    const safeNight = escapeHTML(post.leagueNight || "Not specified");
    const safeContact = escapeHTML(post.contactInfo || "Not provided");
    const requestTypeLabel =
        post.requestType === "lookingToSub"
            ? "Available to Sub"
            : "Looking for a Sub";
    const safeNotes = escapeHTML(post.message || post.notes || "");
    const initials = getInitials(post.name);
    const formattedDate = formatTimestamp(post.createdAt);
    const formattedNeededDate = formatDateOnly(post.dateNeeded);
    const pinnedBadge = post.pinned
        ? `<span class="pinBadge">📌 Pinned</span>`
        : "";

    return `
        <div class="postCardHeader">
            <div class="postAvatar subAvatar">
                ${initials}
            </div>

            <div class="postMeta">
                <span class="postAuthor">
                    ${safeName}
                </span>

                <span class="postTimestamp">
                    ${formattedDate}
                </span>

                ${pinnedBadge}
            </div>

            ${buildPostMenu(postId, Boolean(post.pinned))}
        </div>

        <div class="subRequestBadge">
            ${requestTypeLabel}
        </div>

        <div class="subRequestDetails">
            <div>
                <strong>League Night</strong>
                <span>${safeNight}</span>
            </div>

            <div>
                <strong>Date Needed</strong>
                <span>${formattedNeededDate || "Not specified"}</span>
            </div>

            <div>
                <strong>Contact</strong>
                <span>${safeContact}</span>
            </div>
        </div>

        ${safeNotes ? `<p class="postMessage subNotesDisplay">${safeNotes}</p>` : ""}

        <div class="postActions">
            <button
                class="commentToggleButton"
                type="button"
                data-post-id="${postId}"
            >
                Comments (0)
            </button>
        </div>

        ${buildCommentsSection(postId)}
    `;
}

function createPostCard(postRecord) {
    const { id, category, post } = postRecord;

    const postCard = document.createElement("article");
    postCard.classList.add("postCard");
    postCard.dataset.postId = id;
    postCard.dataset.category = category;

    if (post.pinned) {
        postCard.classList.add("pinnedPost");
    }

    if (category === "subs") {
        postCard.classList.add("subPostCard");
        postCard.innerHTML = buildSubPostCard(post, id);
    } else {
        postCard.innerHTML = buildStandardPostCard(post, id);
    }

    return postCard;
}

function updateBoardCounts(counts) {
    boardCountElements.forEach((element) => {
        const category = element.dataset.countFor;
        const count = counts[category] || 0;

        element.textContent = count;
    });
}

function renderPosts() {
    Object.values(boardContainers).forEach((container) => {
        if (container) {
            container.innerHTML = "";
        }
    });

    const groupedPosts = {
        announcements: [],
        general: [],
        subs: [],
        rules: []
    };

    const boardCounts = {
        announcements: 0,
        general: 0,
        subs: 0,
        rules: 0
    };

    latestPostRecords.forEach((postRecord) => {
        const category = postRecord.category;

        if (!BOARD_CATEGORIES.includes(category)) return;

        boardCounts[category] += 1;
        groupedPosts[category].push(postRecord);
    });

    updateBoardCounts(boardCounts);

    BOARD_CATEGORIES.forEach((category) => {
        const container = boardContainers[category];

        if (!container) return;

        const sortedPosts = sortPostsForDisplay(groupedPosts[category]);

        sortedPosts.forEach((postRecord) => {
            container.appendChild(createPostCard(postRecord));
        });
    });

    renderComments();
}

function renderComments() {
    document.querySelectorAll(".commentsList").forEach((list) => {
        list.innerHTML = "";
    });

    const commentCounts = {};

    latestCommentRecords.forEach((commentRecord) => {
        const { id, comment } = commentRecord;

        if (!comment.postId) return;

        commentCounts[comment.postId] =
            (commentCounts[comment.postId] || 0) + 1;

        const commentsList = document.querySelector(
            `[data-comments-list="${comment.postId}"]`
        );

        if (!commentsList) return;

        const safeName = escapeHTML(comment.name);
        const safeMessage = escapeHTML(comment.message);
        const initials = getInitials(comment.name);
        const formattedDate = formatTimestamp(comment.createdAt);

        const commentCard = document.createElement("div");
        commentCard.classList.add("commentCard");
        commentCard.dataset.commentId = id;

        commentCard.innerHTML = `
            <div class="commentHeader">
                <div class="commentAvatar">
                    ${initials}
                </div>

                <div class="commentMeta">
                    <strong>${safeName}</strong>
                    <span>${formattedDate}</span>
                </div>

                ${isAdmin
                ? `<button
                            class="commentDeleteButton"
                            type="button"
                            data-comment-id="${id}"
                            aria-label="Delete comment"
                        >
                            &times;
                        </button>`
                : ""
            }
            </div>

            <p>${safeMessage}</p>
        `;

        commentsList.appendChild(commentCard);
    });

    document.querySelectorAll(".commentToggleButton").forEach((button) => {
        const postId = button.dataset.postId;
        const count = commentCounts[postId] || 0;

        button.textContent = `Comments (${count})`;
    });
}

async function deletePostAndComments(postId) {
    const commentsForPostQuery = query(
        collection(db, "comments"),
        where("postId", "==", postId)
    );

    const commentsSnapshot = await getDocs(commentsForPostQuery);

    const deleteCommentPromises = commentsSnapshot.docs.map((commentDoc) => {
        return deleteDoc(doc(db, "comments", commentDoc.id));
    });

    await Promise.all(deleteCommentPromises);
    await deleteDoc(doc(db, "posts", postId));
}


// ====================================================
// Auth
// ====================================================

adminSignInButton?.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Admin sign-in failed:", error);
        alert("Sign-in failed. Check the console for details.");
    }
});

adminSignOutButton?.addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Sign-out failed:", error);
        alert("Sign-out failed. Check the console for details.");
    }
});

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    isAdmin = isCurrentUserAdmin(user);

    updateAdminControls();
    renderPosts();
});


// ====================================================
// Modal Open / Close
// ====================================================

modalOpenButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const modalId = button.dataset.modalTarget;
        const modal = document.getElementById(modalId);

        openModal(modal);
    });
});

modalCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const modal = button.closest(".modalOverlay");

        closeModal(modal);
    });
});

document.querySelectorAll(".modalOverlay").forEach((modal) => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
});

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;

    document.querySelectorAll(".modalOverlay.isOpen").forEach((modal) => {
        closeModal(modal);
    });
});


// ====================================================
// Create Posts From Modal Forms
// ====================================================

modalPostForms.forEach((form) => {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const category = form.dataset.category;
        const nameInput = form.querySelector(".modalPostName");
        const messageInput = form.querySelector(".modalPostMessage");
        const pinnedInput = form.querySelector(".modalPostPinned");

        const name = nameInput?.value.trim() || "";
        const message = messageInput?.value.trim() || "";
        const pinned = Boolean(isAdmin && pinnedInput?.checked);

        if (!category || !name) return;

        if (category === "announcements" && !isAdmin) {
            alert("Only admins can post announcements.");
            return;
        }

        if (category === "subs") {
            const requestType = form.querySelector(".subRequestType")?.value || "";
            const leagueNight = form.querySelector(".subLeagueNight")?.value.trim() || "";
            const dateNeeded = form.querySelector(".subDateNeeded")?.value || "";
            const contactInfo = form.querySelector(".subContactInfo")?.value.trim() || "";

            if (!requestType || !leagueNight || !dateNeeded || !contactInfo) return;

            await addDoc(collection(db, "posts"), {
                name,
                category,
                requestType,
                leagueNight,
                dateNeeded,
                contactInfo,
                message,
                pinned: false,
                postType: "subRequest",
                createdAt: serverTimestamp()
            });
        } else {
            if (!message) return;

            await addDoc(collection(db, "posts"), {
                name,
                category,
                message,
                pinned,
                postType: "standard",
                createdAt: serverTimestamp()
            });
        }

        form.reset();
    });
});


// ====================================================
// Display Posts / Board Counts / Pinned Ordering
// ====================================================

const postsQuery = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
);

onSnapshot(postsQuery, (snapshot) => {
    latestPostRecords = [];

    snapshot.forEach((docSnapshot) => {
        const post = docSnapshot.data();
        const category = post.category || "general";

        if (!BOARD_CATEGORIES.includes(category)) return;

        latestPostRecords.push({
            id: docSnapshot.id,
            category,
            post
        });
    });

    renderPosts();
});


// ====================================================
// Comment Toggle
// ====================================================

document.addEventListener("click", (e) => {
    const commentButton = e.target.closest(".commentToggleButton");

    if (!commentButton) return;

    const postId = commentButton.dataset.postId;
    const commentsContainer = document.querySelector(
        `[data-comments-for="${postId}"]`
    );

    if (!commentsContainer) return;

    commentsContainer.hidden = !commentsContainer.hidden;
});


// ====================================================
// Post Menu Toggle / Admin Actions
// ====================================================

document.addEventListener("click", async (e) => {
    const actionButton = e.target.closest("[data-post-action]");

    if (actionButton) {
        if (!isAdmin) return;

        const postId = actionButton.dataset.postId;
        const action = actionButton.dataset.postAction;

        if (!postId || !action) return;

        if (action === "toggle-pin") {
            const currentlyPinned = actionButton.dataset.pinned === "true";

            await updateDoc(doc(db, "posts", postId), {
                pinned: !currentlyPinned
            });

            return;
        }

        if (action === "delete-post") {
            const confirmed = confirm(
                "Delete this post and all of its comments?"
            );

            if (!confirmed) return;

            await deletePostAndComments(postId);
            return;
        }
    }

    const menuButton = e.target.closest(".postMenuButton");

    document.querySelectorAll(".postMenu").forEach((menu) => {
        if (!menuButton || menu !== menuButton.nextElementSibling) {
            menu.hidden = true;
        }
    });

    if (!menuButton) return;

    const menu = menuButton.nextElementSibling;

    if (!menu) return;

    menu.hidden = !menu.hidden;
});


// ====================================================
// Create Comments
// ====================================================

document.addEventListener("submit", async (e) => {
    const commentForm = e.target.closest(".commentForm");

    if (!commentForm) return;

    e.preventDefault();

    const postId = commentForm.dataset.postId;
    const nameInput = commentForm.querySelector(".commentName");
    const messageInput = commentForm.querySelector(".commentMessage");

    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!postId || !name || !message) return;

    await addDoc(collection(db, "comments"), {
        postId,
        name,
        message,
        createdAt: serverTimestamp()
    });

    commentForm.reset();
});


// ====================================================
// Delete Comments
// ====================================================

document.addEventListener("click", async (e) => {
    const deleteButton = e.target.closest(".commentDeleteButton");

    if (!deleteButton) return;
    if (!isAdmin) return;

    const commentId = deleteButton.dataset.commentId;

    if (!commentId) return;

    const confirmed = confirm("Delete this comment?");

    if (!confirmed) return;

    await deleteDoc(doc(db, "comments", commentId));
});


// ====================================================
// Display Comments
// ====================================================

const commentsQuery = query(
    collection(db, "comments"),
    orderBy("createdAt", "asc")
);

onSnapshot(commentsQuery, (snapshot) => {
    latestCommentRecords = [];

    snapshot.forEach((docSnapshot) => {
        latestCommentRecords.push({
            id: docSnapshot.id,
            comment: docSnapshot.data()
        });
    });

    renderComments();
});