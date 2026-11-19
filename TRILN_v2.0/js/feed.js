/**
 * ==========================================
 * TRIATHLON LỤC NAM - ROBUST FEED JS (js/feed.js)
 * ==========================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://triathlonlucnam-default-rtdb.firebaseio.com"
};
const UPLOAD_IMAGE_API = "https://script.google.com/macros/s/AKfycbyfuMUv4GfcAI2i83zHNjzCLQoaSNPDYo1DarTheRJO4K8B0lEQTIKXxZUorJKZFoFO/exec";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const postsRef = ref(db, 'posts');

// Bảng định danh thành viên dự phòng an toàn (Đảm bảo luôn khớp ID để hiện avatar ngay cả khi mất mạng/CORS)
let dynamicMembersMap = {
    "QUÂN": "TL1",
    "TL1": "TL1",
    "QUANG": "TL2",
    "TL2": "TL2",
    "HƯNG": "TL3",
    "VŨ VĂN HƯNG": "TL3",
    "TL3": "TL3",
    "HÙNG": "TL4",
    "VĂN HÙNG": "TL4",
    "TL4": "TL4",
    "MẠNH": "TL5",
    "VĂN MẠNH": "TL5",
    "TL5": "TL5",
    "HỒNG": "TL6",
    "TL6": "TL6",
    "CHIẾN": "TL7",
    "TL7": "TL7"
};

let currentUser = localStorage.getItem('tri_user_name') || "";
let selectedFiles = [];

// 1. Tải danh sách thành viên từ Google Sheets (có cơ chế bọc try-catch an toàn tuyệt đối)
async function loadMembersFromSheet() {
  try {
    const res = await fetch(`${UPLOAD_IMAGE_API}?action=getDashboard`, {
      method: "GET",
      mode: "cors"
    });
    const textData = await res.text();
    let data;
    try {
      data = JSON.parse(textData);
    } catch (e) {
      console.warn("Dữ liệu trả về từ Sheet không phải chuẩn JSON, dùng bảng dự phòng.");
      return;
    }
    
    if (data && data.success && Array.isArray(data.users)) {
      data.users.forEach(u => {
        const id = String(u.id || "").trim().toUpperCase();
        const fullName = String(u.name || "").trim().toUpperCase();
        if (id && fullName) {
          dynamicMembersMap[fullName] = id;
          const nameParts = fullName.split(/\s+/);
          const shortName = nameParts[nameParts.length - 1];
          if (shortName && !dynamicMembersMap[shortName]) {
            dynamicMembersMap[shortName] = id;
          }
        }
      });
      console.log("Đã đồng bộ thành công danh sách thành viên từ Google Sheets!");
    }
  } catch (err) {
    console.warn("Lỗi kết nối Sheet (đang dùng bảng dự phòng cục bộ để không bị gián đoạn):", err.message);
  }
}

// 2. Hàm trả về Avatar chuẩn có cơ chế dự phòng không bao giờ lỗi
function getAvatarHtml(name) {
  if (!name) return `<img src="avatars/default.jpg" alt="Thành viên">`;
  const cleanStr = name.trim().toUpperCase();
  
  let id = "";
  if (cleanStr.startsWith("TL") && cleanStr.length <= 4) {
      id = cleanStr;
  } else {
      id = dynamicMembersMap[cleanStr] || "";
      if (!id) {
        for (const [key, val] of Object.entries(dynamicMembersMap)) {
          if (cleanStr.includes(key) || key.includes(cleanStr)) {
            id = val;
            break;
          }
        }
      }
  }

  const avatarUrl = id ? `avatars/avatar/${id}.jpg` : "avatars/default.jpg";
  const fallbackChar = cleanStr.charAt(0) || "?";
  
  return `<img src="${avatarUrl}" alt="${cleanStr}" onerror="this.onerror=null; this.src='avatars/default.png'; this.onerror=function(){this.parentNode.innerHTML='${fallbackChar}';};">`;
}

function initUser() {
  if (!currentUser) {
    currentUser = prompt("Nhập tên hiển thị của anh (VD: Hưng, Văn Hùng, Mạnh...):") || "Thành viên";
    localStorage.setItem('tri_user_name', currentUser.trim());
  }
  const badgeEl = document.getElementById('currentUserBadge');
  const myAvatarEl = document.getElementById('myAvatar');
  if (badgeEl) badgeEl.innerText = `👤 ${currentUser}`;
  if (myAvatarEl) myAvatarEl.innerHTML = getAvatarHtml(currentUser);
}

window.changeUser = function() {
  const newName = prompt("Đổi tên hiển thị:", currentUser);
  if (newName && newName.trim()) {
    currentUser = newName.trim();
    localStorage.setItem('tri_user_name', currentUser);
    initUser();
    location.reload();
  }
};

// 3. Xử lý chọn nhiều ảnh
window.handleFilesSelect = function(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  if (selectedFiles.length + files.length > 6) {
    alert("Anh chỉ có thể chọn tối đa 6 ảnh trong 1 bài viết nhé!");
    return;
  }

  files.forEach(file => selectedFiles.push(file));
  renderPreviews();
};

function renderPreviews() {
  const previewBox = document.getElementById('previewBox');
  const previewGrid = document.getElementById('previewGrid');
  if (!previewBox || !previewGrid) return;

  if (selectedFiles.length === 0) {
    previewBox.style.display = 'none';
    previewGrid.innerHTML = '';
    return;
  }

  previewBox.style.display = 'block';
  previewGrid.innerHTML = '';

  selectedFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.className = 'preview-item';
      div.innerHTML = `
        <img src="${e.target.result}">
        <button class="remove-img-btn" onclick="removeSelectedFile(${index})">✕</button>
      `;
      previewGrid.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
};

window.removeSelectedFile = function(index) {
  selectedFiles.splice(index, 1);
  renderPreviews();
  const fileInput = document.getElementById('imageInput');
  if (fileInput && selectedFiles.length === 0) fileInput.value = "";
};

function compressImage(file, maxWidth = 900, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = maxWidth / img.width;
        canvas.width = img.width > maxWidth ? maxWidth : img.width;
        canvas.height = img.width > maxWidth ? img.height * scale : img.height;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
}

window.createPost = async function() {
  const caption = document.getElementById('captionInput').value.trim();
  if (!caption && selectedFiles.length === 0) return alert("Hãy viết gì đó hoặc chọn ít nhất một ảnh nhé anh!");

  const btn = document.getElementById('btnPost');
  btn.disabled = true;
  btn.innerText = "Đang đăng...";

  try {
    let imageUrls = [];
    for (const file of selectedFiles) {
      const base64 = await compressImage(file);
      const res = await fetch(UPLOAD_IMAGE_API, {
        method: "POST",
        body: JSON.stringify({ action: "uploadImageOnly", imageBase64: base64 })
      });
      const data = await res.json();
      if (data.imageUrl) imageUrls.push(data.imageUrl);
    }

    const newPostRef = push(postsRef);
    await set(newPostRef, {
      author: currentUser,
      caption: caption,
      imageUrl: imageUrls.length === 1 ? imageUrls[0] : "",
      imageUrls: imageUrls,
      timestamp: Date.now(),
      likes: {},
      comments: {}
    });

    document.getElementById('captionInput').value = "";
    selectedFiles = [];
    renderPreviews();
    const fileInput = document.getElementById('imageInput');
    if (fileInput) fileInput.value = "";
  } catch (err) {
    alert("Lỗi kết nối khi đăng bài, anh kiểm tra lại nhé!");
  } finally {
    btn.disabled = false;
    btn.innerText = "Đăng";
  }
};

// 4. Sửa / Xóa bài viết & bình luận
window.togglePostMenu = function(postId) {
  const dropdown = document.getElementById(`menu-${postId}`);
  if (dropdown) dropdown.classList.toggle('show');
};

window.editPost = async function(postId, currentCaption) {
  const newCaption = prompt("Chỉnh sửa nội dung bài viết:", currentCaption);
  if (newCaption === null) return;
  try {
    await update(ref(db, `posts/${postId}`), { caption: newCaption.trim() });
  } catch (err) {
    alert("Không thể sửa bài viết.");
  }
};

window.deletePost = async function(postId) {
  if (!confirm("Anh có chắc chắn muốn xóa bài viết này không?")) return;
  try {
    await remove(ref(db, `posts/${postId}`));
  } catch (err) {
    alert("Không thể xóa bài viết.");
  }
};

window.toggleLike = function(postId, isLiked) {
  const safeUserKey = currentUser.replace(/[.#$\[\]]/g, "_");
  const likeRef = ref(db, `posts/${postId}/likes/${safeUserKey}`);
  set(likeRef, isLiked ? null : true);
};

window.sendComment = function(postId) {
  const input = document.getElementById(`cmt-${postId}`);
  const text = input.value.trim();
  if (!text) return;

  const cmtRef = push(ref(db, `posts/${postId}/comments`));
  set(cmtRef, {
    author: currentUser,
    text: text,
    timestamp: Date.now()
  });
  input.value = "";
};

window.editComment = async function(postId, cmtId, currentText) {
  const newText = prompt("Chỉnh sửa bình luận:", currentText);
  if (newText === null || !newText.trim()) return;
  try {
    await update(ref(db, `posts/${postId}/comments/${cmtId}`), { text: newText.trim() });
  } catch (err) {
    alert("Không thể sửa bình luận.");
  }
};

window.deleteComment = async function(postId, cmtId) {
  if (!confirm("Xóa bình luận này?")) return;
  try {
    await remove(ref(db, `posts/${postId}/comments/${cmtId}`));
  } catch (err) {
    alert("Không thể xóa bình luận.");
  }
};

// 5. Xem ảnh Fullscreen
window.openImageViewer = function(imgSrc) {
  const modal = document.getElementById('imageViewerModal');
  const fullImg = document.getElementById('fullImage');
  if (modal && fullImg) {
    fullImg.src = imgSrc;
    modal.style.display = 'flex';
  }
};

window.closeImageViewer = function() {
  const modal = document.getElementById('imageViewerModal');
  if (modal) modal.style.display = 'none';
};

function formatTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1} lúc ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 6. Khởi chạy sự kiện Realtime
document.addEventListener("DOMContentLoaded", async () => {
  // Cố gắng tải từ Sheet, nếu lỗi CORS/mạng sẽ tự động bỏ qua và dùng danh sách dự phòng an toàn
  await loadMembersFromSheet();
  initUser();

  window.addEventListener('click', (e) => {
    if (!e.target.closest('.post-options-menu')) {
      document.querySelectorAll('.options-dropdown').forEach(d => d.classList.remove('show'));
    }
  });

  onValue(postsRef, (snapshot) => {
    const feedEl = document.getElementById('newsfeed');
    if (!feedEl) return;
    const data = snapshot.val();
    if (!data) {
      feedEl.innerHTML = "<p style='text-align:center; padding:30px; color:#65676b;'>Chưa có bài đăng nào. Anh em mở hàng đi nào!</p>";
      return;
    }

    const safeUserKey = currentUser.replace(/[.#$\[\]]/g, "_");
    const postsArray = Object.entries(data).map(([id, val]) => ({ id, ...val })).reverse();

    feedEl.innerHTML = postsArray.map(post => {
      const likesObj = post.likes || {};
      const likeCount = Object.keys(likesObj).length;
      const isLiked = !!likesObj[safeUserKey];

      let imgs = post.imageUrls || [];
      if (imgs.length === 0 && post.imageUrl) imgs = [post.imageUrl];

      let imagesHtml = '';
      if (imgs.length > 0) {
        let gridClass = 'grid-1';
        if (imgs.length === 2) gridClass = 'grid-2';
        else if (imgs.length === 3) gridClass = 'grid-3';
        else if (imgs.length >= 4) gridClass = 'grid-more';

        const imgItems = imgs.slice(0, 4).map((url, idx) => {
          let overlay = (imgs.length > 4 && idx === 3) ? `<div class="more-overlay">+${imgs.length - 4}</div>` : '';
          return `
            <div class="grid-img-item" onclick="openImageViewer('${url}')">
              <img src="${url}" loading="lazy">
              ${overlay}
            </div>
          `;
        }).join('');

        imagesHtml = `<div class="post-images-grid ${gridClass}">${imgItems}</div>`;
      }

      const commentsObj = post.comments || {};
      const commentsArr = Object.entries(commentsObj).map(([cmtId, cVal]) => ({ cmtId, ...cVal }));

      const isPostOwner = String(post.author || "").trim().toLowerCase() === String(currentUser || "").trim().toLowerCase();

      return `
        <div class="post-card">
          <div class="post-header">
            <div class="post-user-meta">
              <div class="avatar">${getAvatarHtml(post.author)}</div>
              <div class="post-info">
                <h3>${post.author}</h3>
                <span>${formatTime(post.timestamp)} • 🌍</span>
              </div>
            </div>

            ${isPostOwner ? `
              <div class="post-options-menu">
                <button class="options-btn" onclick="togglePostMenu('${post.id}')"><i class="fa-solid fa-ellipsis"></i></button>
                <div class="options-dropdown" id="menu-${post.id}">
                  <button class="dropdown-item" onclick="editPost('${post.id}', \`${(post.caption || '').replace(/`/g, '\\`')}\`)"><i class="fa-solid fa-pen"></i> Sửa bài</button>
                  <button class="dropdown-item delete" onclick="deletePost('${post.id}')"><i class="fa-solid fa-trash"></i> Xóa bài</button>
                </div>
              </div>
            ` : ''}
          </div>
          
          ${post.caption ? `<div class="post-caption">${post.caption}</div>` : ''}
          ${imagesHtml}
          
          <div class="post-stats">
            <span>${likeCount > 0 ? `👍 ${likeCount}` : ''}</span>
            <span>${commentsArr.length > 0 ? `${commentsArr.length} bình luận` : ''}</span>
          </div>

          <div class="post-actions">
            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', ${isLiked})">
              ${isLiked ? '👍 Đã thích' : '👍 Thích'}
            </button>
            <button class="action-btn" onclick="document.getElementById('cmt-${post.id}').focus()">
              💬 Bình luận
            </button>
          </div>

          <div class="comments-section">
            ${commentsArr.map(c => {
              const isCmtOwner = String(c.author || "").trim().toLowerCase() === String(currentUser || "").trim().toLowerCase();
              return `
                <div class="comment-item">
                  <div class="comment-avatar">${getAvatarHtml(c.author)}</div>
                  <div class="comment-content-wrap">
                    <div class="comment-bubble">
                      <div class="comment-author">${c.author}</div>
                      <div class="comment-text">${c.text}</div>
                    </div>
                    <div class="comment-footer-row">
                      <span>${formatTime(c.timestamp)}</span>
                      ${isCmtOwner ? `
                        <button class="comment-action-link" onclick="editComment('${post.id}', '${c.cmtId}', \`${c.text.replace(/`/g, '\\`')}\`)">Sửa</button>
                        <button class="comment-action-link" style="color:#dc2626;" onclick="deleteComment('${post.id}', '${c.cmtId}')">Xóa</button>
                      ` : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}

            <div class="comment-input-box">
              <div class="avatar comment-avatar">${getAvatarHtml(currentUser)}</div>
              <input type="text" class="comment-input" id="cmt-${post.id}" placeholder="Viết bình luận..." onkeypress="if(event.key==='Enter') sendComment('${post.id}')">
              <button class="btn-send-cmt" onclick="sendComment('${post.id}')">Gửi</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  });
});