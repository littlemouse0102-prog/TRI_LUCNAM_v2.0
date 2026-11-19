/**
 * ==========================================
 * TRIATHLON LỤC NAM - MEMBER LOGIC (member.js)
 * ==========================================
 */

const THEME_PREVIEW_COLORS = {
    '1': '#71717a', '2': '#475569', '3': '#059669', '4': '#4f46e5',
    '5': '#7c3aed', '6': '#e11d48', '7': '#d97706', '8': '#0891b2',
    '9': '#0284c7', '10': '#0d9488', '11': '#c026d3', '12': '#65a30d',
    '13': '#ea580c', '14': '#dc2626', '15': '#ca8a04', '16': '#9333ea',
    '17': '#0f172a', '18': '#3b82f6', '19': '#581c87', '20': '#78350f'
};

// 1. CÁC HÀM TIỆN ÍCH (Global Scope)
function parseDecimal(value) {
    if (value === null || value === undefined || value === '') return 0;
    const normalized = String(value).trim().replace(',', '.');
    const num = parseFloat(normalized);
    return Number.isFinite(num) ? num : 0;
}

function calculateEstimatedPoints(swim, bike, run) {
    const sPts = parseDecimal(swim) * 0.008; // 1m = 0.008đ
    const bPts = parseDecimal(bike) * 0.6;   // 1km = 0.6đ
    const rPts = parseDecimal(run) * 1.4;    // 1km = 1.4đ
    return (sPts + bPts + rPts).toFixed(1);
}

function normalizeThemeId(themeName) {
    if (!themeName || themeName === 'default') return '1';
    const num = Number(themeName);
    if (!Number.isNaN(num) && num >= 1 && num <= 20) {
        return String(Math.trunc(num));
    }
    return '1';
}

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Hàm thay đổi, lưu trữ và đồng bộ theme (1.css -> 20.css)
function setTheme(themeName) {
    const normalized = normalizeThemeId(themeName);
    localStorage.setItem('app_theme', normalized);
    loadThemeCss(normalized);

    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) dropdown.classList.remove('show');
}

function loadThemeCss(themeName) {
    const safeTheme = normalizeThemeId(themeName);
    document.documentElement.setAttribute('data-theme', safeTheme);

    let themeLink = document.getElementById('dynamic-theme-css');
    if (!themeLink) {
        themeLink = document.createElement('link');
        themeLink.id = 'dynamic-theme-css';
        themeLink.rel = 'stylesheet';
        document.head.appendChild(themeLink);
    }

    themeLink.href = `css/theme/${safeTheme}.css`;

    const currentDot = document.querySelector('.theme-current-color');
    if (currentDot && THEME_PREVIEW_COLORS[safeTheme]) {
        currentDot.style.background = THEME_PREVIEW_COLORS[safeTheme];
    }
}

function handleLogout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';
}

function switchActivityTab(tabName) {
    const btnPersonal = document.getElementById('btnTabPersonal');
    const btnTeam = document.getElementById('btnTabTeam');
    const contentPersonal = document.getElementById('tabContentPersonal');
    const contentTeam = document.getElementById('tabContentTeam');

    const isPersonal = tabName !== 'team';

    if (btnPersonal) {
        btnPersonal.classList.toggle('active', isPersonal);
        btnPersonal.style.background = isPersonal ? 'var(--primary)' : 'transparent';
        btnPersonal.style.color = isPersonal ? '#fff' : 'var(--text-muted)';
    }
    if (btnTeam) {
        btnTeam.classList.toggle('active', !isPersonal);
        btnTeam.style.background = !isPersonal ? 'var(--primary)' : 'transparent';
        btnTeam.style.color = !isPersonal ? '#fff' : 'var(--text-muted)';
    }
    if (contentPersonal) contentPersonal.style.display = isPersonal ? 'block' : 'none';
    if (contentTeam) contentTeam.style.display = isPersonal ? 'none' : 'block';
}

// 2. KHỞI TẠO DOM DUY NHẤT
document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = null;
    try {
        if (typeof getCurrentUser === 'function') {
            currentUser = getCurrentUser();
        } else {
            const userJson = localStorage.getItem('triathlon_user');
            currentUser = userJson ? JSON.parse(userJson) : null;
        }
    } catch (err) {
        console.error('Lỗi đọc thông tin người dùng:', err);
    }

    if (!currentUser) {
        alert('🔒 Vui lòng đăng nhập!');
        window.location.href = 'index.html';
        return;
    }

    // Nạp theme đã lưu ngay khi mở trang
    const savedTheme = normalizeThemeId(localStorage.getItem('app_theme'));
    localStorage.setItem('app_theme', savedTheme);
    loadThemeCss(savedTheme);

    // Hiển thị nút ADMIN nếu có quyền
    if (currentUser.role === 'ADMIN') {
        const container = document.getElementById('admin-link-container');
        if (container) {
            container.innerHTML = `
                <a href="admin.html" class="nav-item">
                    <i class="fa-solid fa-shield-halved"></i>
                    <span>ADMIN</span>
                </a>
            `;
        }
    }

    // Bật/tắt menu chọn theme
    const themeBtn = document.getElementById('themeSwitcherBtn');
    const themeDropdown = document.getElementById('themeDropdown');
    if (themeBtn && themeDropdown) {
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            themeDropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => themeDropdown.classList.remove('show'));
        themeDropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    // Nút bấm mở/đóng form cập nhật kết quả hôm nay
    const toggleBtn = document.getElementById('toggleFormBtn');
    const formContainer = document.getElementById('activityFormContainer');
    if (toggleBtn && formContainer) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = formContainer.style.display === 'none' || getComputedStyle(formContainer).display === 'none';
            formContainer.style.display = isHidden ? 'block' : 'none';
            toggleBtn.classList.toggle('active', isHidden);
            if (isHidden) {
                formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    // Định dạng input số thập phân (hỗ trợ cả dấu phẩy và dấu chấm)
    document.querySelectorAll('.decimal-input').forEach(input => {
        input.addEventListener('input', function () {
            let cleaned = this.value.replace(/[^0-9.,]/g, '');
            const firstSepIndex = cleaned.search(/[,.]/);
            if (firstSepIndex !== -1) {
                const sep = cleaned[firstSepIndex];
                const before = cleaned.slice(0, firstSepIndex);
                const after = cleaned.slice(firstSepIndex + 1).replace(/[,.]/g, '');
                cleaned = before + sep + after;
            }
            this.value = cleaned;
        });
    });

    // Render profile cơ bản & tải dữ liệu dashboard
    renderBasicProfile(currentUser);
    await loadMemberDashboardData(currentUser.id);

    // Xử lý Form gửi thành tích + Popup chi tiết
    const activityForm = document.getElementById('activityForm');
    let tempActivityData = { swim: 0, bike: 0, run: 0 };

    if (activityForm) {
        activityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const swimVal = parseDecimal(document.getElementById('swimInput')?.value);
            const bikeVal = parseDecimal(document.getElementById('bikeInput')?.value);
            const runVal = parseDecimal(document.getElementById('runInput')?.value);

            if (swimVal === 0 && bikeVal === 0 && runVal === 0) {
                alert('⚠️ Vui lòng nhập thành tích!');
                return;
            }

            if ((swimVal > 0 && swimVal < 100) || (bikeVal > 0 && bikeVal < 10) || (runVal > 0 && runVal < 5)) {
                alert('⚠️ Giá trị nhập không hợp lệ:\nBơi >= 100m, Đạp >= 10km, Chạy >= 5km');
                return;
            }

            tempActivityData = { swim: swimVal, bike: bikeVal, run: runVal };
            const detailModal = document.getElementById('detailModal');
            if (detailModal) {
                detailModal.style.display = 'flex';
            } else {
                await submitFinalActivityWithLoading(currentUser, tempActivityData, 'Bình thường', '', 'Không', '');
                activityForm.reset();
            }
        });
    }

    const btnSubmitDetail = document.getElementById('btnSubmitDetail');
    if (btnSubmitDetail) {
        btnSubmitDetail.addEventListener('click', async () => {
            const level = document.getElementById('inputLevel')?.value || 'Bình thường';
            const goal = document.getElementById('inputGoal')?.value || '';
            const injury = document.getElementById('inputInjury')?.value || 'Không';
            const note = document.getElementById('inputNote')?.value || '';

            const detailModal = document.getElementById('detailModal');
            if (detailModal) detailModal.style.display = 'none';

            await submitFinalActivityWithLoading(currentUser, tempActivityData, level, goal, injury, note);
            if (activityForm) activityForm.reset();
        });
    }

    const btnCancelDetail = document.getElementById('btnCancelDetail');
    if (btnCancelDetail) {
        btnCancelDetail.addEventListener('click', () => {
            const detailModal = document.getElementById('detailModal');
            if (detailModal) detailModal.style.display = 'none';
        });
    }

    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', handleLogout);
    }
});

// 3. GỬI DỮ LIỆU HOÀN TẤT
async function submitFinalActivityWithLoading(currentUser, data, level, goal, injury, note) {
    const btnSubmitDetail = document.getElementById('btnSubmitDetail');
    const mainSubmitBtn = document.querySelector('.submit-btn');

    if (btnSubmitDetail) {
        btnSubmitDetail.disabled = true;
        btnSubmitDetail.style.opacity = '0.6';
        btnSubmitDetail.style.cursor = 'not-allowed';
        btnSubmitDetail.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang ghi nhận...';
    }
    if (mainSubmitBtn) {
        mainSubmitBtn.disabled = true;
        mainSubmitBtn.style.opacity = '0.6';
        mainSubmitBtn.style.cursor = 'not-allowed';
        mainSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
    }

    const payload = {
        id: currentUser.id,
        name: currentUser.name,
        swim: data.swim,
        bike: data.bike,
        run: data.run,
        level,
        goal,
        injury,
        note
    };

    try {
        if (typeof uploadActivityData !== 'function') {
            throw new Error('Không tìm thấy hàm uploadActivityData trong js/api.js');
        }

        const response = await uploadActivityData(payload);

        if (response && response.success) {
            alert('🎉 Ghi nhận thành công!');
            await loadMemberDashboardData(currentUser.id);
        } else {
            alert('❌ Lỗi: ' + (response?.msg || 'Không thể kết nối hệ thống'));
        }
    } catch (err) {
        console.error('Lỗi khi gửi thành tích:', err);
        alert('❌ ' + (err?.message || 'Đã xảy ra lỗi hệ thống, vui lòng thử lại.'));
    } finally {
        if (btnSubmitDetail) {
            btnSubmitDetail.disabled = false;
            btnSubmitDetail.style.opacity = '1';
            btnSubmitDetail.style.cursor = 'pointer';
            btnSubmitDetail.innerHTML = 'Hoàn tất';
        }
        if (mainSubmitBtn) {
            mainSubmitBtn.disabled = false;
            mainSubmitBtn.style.opacity = '1';
            mainSubmitBtn.style.cursor = 'pointer';
            mainSubmitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Gửi Thành Tích';
        }
    }
}

// 4. RENDER & TẢI DỮ LIỆU DASHBOARD
function renderBasicProfile(user) {
    const userNameEl = document.getElementById('userName');
    const userCodeEl = document.getElementById('userCode');
    const userAvatarEl = document.getElementById('userAvatar');

    if (userNameEl) userNameEl.innerText = user.name || 'Thành viên';
    if (userCodeEl) userCodeEl.innerText = `Mã số: ${user.id || 'TL--'}`;

    if (userAvatarEl && user.id) {
        userAvatarEl.src = `avatars/avatar/${encodeURIComponent(user.id)}.jpg`;
        userAvatarEl.onerror = function () {
            this.onerror = null;
            this.src = 'avatars/default.jpg';
        };
    }
}

function formatActivityDate(rawDate) {
    if (!rawDate) return 'Hôm nay';
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return escapeHtml(rawDate);
    return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function loadMemberDashboardData(userId) {
    const historyLogList = document.getElementById('historyLogList');
    if (!historyLogList) return;

    try {
        if (typeof callSystemAPI !== 'function') {
            throw new Error('Không tìm thấy hàm callSystemAPI trong js/api.js');
        }

        const response = await callSystemAPI('getDashboard', { userId });

        if (!response || !response.success) {
            historyLogList.innerHTML = `<div class="empty-log" style="color: var(--danger);">⚠️ Không thể tải dữ liệu: ${escapeHtml(response?.msg || 'Lỗi kết nối')}</div>`;
            return;
        }

        const currentUserName = (document.getElementById('userName')?.innerText || '').trim().toLowerCase();
        const normalizedUserId = String(userId ?? '').trim();

        const userInRank = response.users?.find(r =>
            String(r.id ?? '').trim() === normalizedUserId ||
            String(r.name ?? '').trim().toLowerCase() === currentUserName
        );

        const myActivities = (response.activities || []).filter(act =>
            String(act.userId ?? '').trim() === normalizedUserId ||
            (act.name && String(act.name).trim().toLowerCase() === currentUserName)
        );

        const totalSwim = userInRank?.swim ?? myActivities.reduce((sum, act) => sum + parseDecimal(act.swim), 0);
        const totalBike = userInRank?.bike ?? myActivities.reduce((sum, act) => sum + parseDecimal(act.bike), 0);
        const totalRun = userInRank?.run ?? myActivities.reduce((sum, act) => sum + parseDecimal(act.run), 0);

        const rankEl = document.getElementById('userGlobalRank');
        const scoreEl = document.getElementById('userTotalScore');
        const cupsEl = document.getElementById('userCups');
        const swimEl = document.getElementById('userTotalSwim');
        const bikeEl = document.getElementById('userTotalBike');
        const runEl = document.getElementById('userTotalRun');

        if (userInRank) {
            if (rankEl) rankEl.innerText = userInRank.rank ? `#${userInRank.rank}` : 'N/A';
            if (scoreEl) {
                const pointsValue = Number(userInRank.points) || 0;
                scoreEl.innerText = `${pointsValue.toFixed(0)}đ`;
            }
            if (cupsEl) {
                const cupCount = Number(userInRank.cups ?? userInRank.cup) || 0;
                cupsEl.innerText = cupCount > 0 ? '🏆'.repeat(cupCount) : '0 🏆';
            }
        } else {
            if (rankEl) rankEl.innerText = '#--';
            if (scoreEl) scoreEl.innerText = '0đ';
            if (cupsEl) cupsEl.innerText = '0 🏆';
        }

        if (swimEl) swimEl.innerText = (parseDecimal(totalSwim) / 1000).toFixed(1);
        if (bikeEl) bikeEl.innerText = parseDecimal(totalBike).toFixed(1);
        if (runEl) runEl.innerText = parseDecimal(totalRun).toFixed(1);

        const deviationEl = document.getElementById('deviationStatus');
        const suggestionEl = document.getElementById('trainingSuggestion');

        if (userInRank) {
            if (deviationEl) deviationEl.textContent = userInRank.deviation ? `Độ lệch: ${userInRank.deviation}` : 'Đang cập nhật chỉ số độ lệch...';
            if (suggestionEl) suggestionEl.textContent = userInRank.missing || 'Chưa có đề xuất tập luyện mới.';
        } else {
            if (deviationEl) deviationEl.textContent = 'Chưa có dữ liệu phân tích.';
            if (suggestionEl) suggestionEl.textContent = 'Hãy cập nhật thành tích để nhận đề xuất tối ưu!';
        }

        // Nhật ký cá nhân
        if (myActivities.length > 0) {
            historyLogList.innerHTML = '';
            const sortedPersonal = [...myActivities].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            sortedPersonal.forEach(act => {
                const logItem = document.createElement('div');
                logItem.className = 'history-item';

                const swimNum = parseDecimal(act.swim);
                const bikeNum = parseDecimal(act.bike);
                const runNum = parseDecimal(act.run);

                const swimText = swimNum > 0 ? `🏊 ${swimNum}m ` : '';
                const bikeText = bikeNum > 0 ? `🚴 ${bikeNum}km ` : '';
                const runText = runNum > 0 ? `🏃 ${runNum}km` : '';
                const points = calculateEstimatedPoints(swimNum, bikeNum, runNum);

                logItem.innerHTML = `
                    <div>
                        <span style="font-weight: 600; display: block; font-size: 11px; margin-bottom: 4px;">Ngày gửi: ${escapeHtml(formatActivityDate(act.date))}</span>
                        <span style="color: var(--text-muted); font-size: 12px; font-weight: 500;">${escapeHtml(swimText + bikeText + runText)}</span>
                    </div>
                    <div style="font-weight: 700; color: var(--primary); background-color: var(--light); padding: 4px 10px; border-radius: 20px; font-size: 12px;">
                        +${escapeHtml(points)}đ
                    </div>
                `;
                historyLogList.appendChild(logItem);
            });
        } else {
            historyLogList.innerHTML = '<div class="empty-log">Bạn chưa có hoạt động nào được ghi nhận gần đây. Hãy tập luyện và cập nhật kết quả ngay nhé!</div>';
        }

        // Hoạt động của Team
        const actList = document.getElementById('activityList');
        if (actList && Array.isArray(response.activities)) {
            actList.innerHTML = '';
            const sortedTeamActivities = [...response.activities].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            if (sortedTeamActivities.length === 0) {
                actList.innerHTML = '<div class="empty-log">Chưa có hoạt động nào từ team.</div>';
            } else {
                sortedTeamActivities.forEach((act) => {
                    const swimNum = parseDecimal(act.swim);
                    const bikeNum = parseDecimal(act.bike);
                    const runNum = parseDecimal(act.run);
                    const points = calculateEstimatedPoints(swimNum, bikeNum, runNum);

                    const metricsParts = [];
                    if (swimNum > 0) metricsParts.push(`🏊 ${swimNum.toFixed(0)}m`);
                    if (bikeNum > 0) metricsParts.push(`🚴 ${bikeNum.toFixed(1)}km`);
                    if (runNum > 0) metricsParts.push(`🏃 ${runNum.toFixed(1)}km`);

                    const div = document.createElement('div');
                    div.className = 'activity-item animate-fade-in';
                    div.innerHTML = `
                        <div>
                            <span style="font-weight: 600; display: block; font-size: 11px; margin-bottom: 4px;">
                                ${escapeHtml(act.name || 'Thành viên')} - ${escapeHtml(formatActivityDate(act.date))}
                            </span>
                            <span style="color: var(--text-muted); font-size: 12px; font-weight: 500;">
                                ${escapeHtml(metricsParts.join(' '))}
                            </span>
                        </div>
                        <div style="font-weight: 700; color: var(--primary); background-color: var(--light); padding: 4px 10px; border-radius: 20px; font-size: 12px;">
                            +${escapeHtml(points)}đ
                        </div>
                    `;
                    actList.appendChild(div);
                });
            }
        }

        // Bảng xếp hạng
        const rankingTableBody = document.getElementById('rankingTableBody');
        if (rankingTableBody && Array.isArray(response.users)) {
            rankingTableBody.innerHTML = '';

            const sortedRankings = [...response.users]
                .filter(user => parseDecimal(user.points) > 0)
                .sort((a, b) => parseDecimal(b.points) - parseDecimal(a.points));

            if (sortedRankings.length > 0) {
                sortedRankings.forEach((rankItem, index) => {
                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid var(--border)';

                    const isCurrentUser =
                        String(rankItem.id ?? '').trim() === normalizedUserId ||
                        String(rankItem.name ?? '').trim().toLowerCase() === currentUserName;

                    if (isCurrentUser) {
                        row.style.backgroundColor = 'var(--light)';
                        row.style.fontWeight = '600';
                    }

                    const pointsVal = parseDecimal(rankItem.points);
                    const cupsVal = Number(rankItem.cups ?? rankItem.cup) || 0;

                    row.innerHTML = `
                        <td style="text-align: center; font-weight: 700; padding: 10px 8px;">#${escapeHtml(rankItem.rank || (index + 1))}</td>
                        <td style="padding: 10px 8px; color: var(--text-main);">${escapeHtml(rankItem.name || 'Thành viên')}</td>
                        <td style="text-align: right; color: var(--primary); font-weight: 700; padding: 10px 8px;">${escapeHtml(pointsVal.toFixed(0))}đ</td>
                        <td style="text-align: center; padding: 10px 8px;">${cupsVal > 0 ? '🏆 ' + escapeHtml(cupsVal) : '-'}</td>
                    `;
                    rankingTableBody.appendChild(row);
                });
            } else {
                rankingTableBody.innerHTML = '<tr><td colspan="4" class="ranking-loading">Chưa có dữ liệu xếp hạng.</td></tr>';
            }
        }
    } catch (err) {
        console.error('Lỗi tải dashboard:', err);
        historyLogList.innerHTML = `<div class="empty-log" style="color: var(--danger);">⚠️ Không thể tải dữ liệu: ${escapeHtml(err?.message || 'Lỗi kết nối')}</div>`;
    }
}