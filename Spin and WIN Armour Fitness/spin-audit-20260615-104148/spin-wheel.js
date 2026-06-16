// DOM-based premium wheel elements
const wheelEl = document.getElementById('wheel');
const sectorsContainer = document.getElementById('sectors');
const ledRing = document.getElementById('ledRing');
const spinButton = document.getElementById('spinButton');
const resultModal = document.getElementById('resultModal');
const closeModal = document.getElementById('closeModal');
const claimButton = document.getElementById('claimButton');
const whatsappButton = document.getElementById('whatsappButton');
const prizeNameEl = document.getElementById('prizeName');
const prizeCodeEl = document.getElementById('prizeCode');
const expiryDateEl = document.getElementById('expiryDate');
const confettiRoot = document.getElementById('confettiRoot');

const wheelConfig = {
    sectors: [
        { label: '60% OFF MONTHLY', color: '#b71c1c' },
        { label: 'FREE 1 MONTH', color: '#0d47a1' },
        { label: '3 MONTHS FREE', color: '#6a1b9a' },
        { label: 'YEARLY @ ₹7,499', color: '#0b3d64' },
        { label: 'YEARLY + 6M PT FREE', color: '#1b5e20' },
        { label: 'FREE YEARLY', color: '#b88700' }
    ],
    probabilities: [0.55, 0.225, 0.15, 0.07, 0.005, 0],
    whatsapp: '919347009385',
    accessKey: 'armourSpinAccess',
    completedKey: 'armourSpinCompleted',
    homeUrl: 'ArmourFitnessFactory.html'
};
const leadCaptureUrl = 'https://script.google.com/macros/s/AKfycbzbqnlJqXe6aSRZeYwMoK56hy7568tF8d5L2cG2h1vd5_01Fz7z8P_7Qah5UJ6KfMO5/exec';

function createHiddenGoogleForm() {
    let iframe = document.querySelector('iframe[name="gsHiddenFrame"]');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.name = 'gsHiddenFrame';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }
    return iframe;
}

function showDebugPanel(message) {
    let panel = document.getElementById('debugPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'debugPanel';
        panel.style.position = 'fixed';
        panel.style.bottom = '20px';
        panel.style.right = '20px';
        panel.style.maxWidth = '320px';
        panel.style.padding = '12px';
        panel.style.border = '1px solid rgba(0,0,0,0.12)';
        panel.style.borderRadius = '12px';
        panel.style.background = 'rgba(255,255,255,0.96)';
        panel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.12)';
        panel.style.color = '#111';
        panel.style.fontSize = '12px';
        panel.style.lineHeight = '1.4';
        panel.style.zIndex = '9999';
        panel.style.whiteSpace = 'pre-wrap';
        panel.style.display = 'none';
        document.body.appendChild(panel);
    }
    panel.textContent = message;
    panel.style.display = 'block';
}

function sendToGoogleScript(payload) {
    console.log('sendToGoogleScript payload', payload);
    if (!leadCaptureUrl || leadCaptureUrl.includes('YOUR_SCRIPT_ID')) return;
    localStorage.setItem('armourLastWinPayload', JSON.stringify(payload));
    localStorage.setItem('armourLastWinStatus', 'submitted');
    createHiddenGoogleForm();
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = leadCaptureUrl;
    form.target = 'gsHiddenFrame';
    Object.entries(payload).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 1000);
}

let currentRotation = 0;
let isSpinning = false;
let hasSpun = false;
let currentReward = '';
let currentCode = '';
let currentSpinId = '';
let currentTimestamp = '';
let wheelRadius = 0;
let winRecordSent = false;
let resultAutoCloseTimer = null;
let resultRedirectTimer = null;

function generateSpinId() {
    // Keep every completed spin unique before it is written to Google Sheets.
    return `SPIN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

// Create DOM sectors and visuals
function createSectors(){
    sectorsContainer.innerHTML='';
    const count = wheelConfig.sectors.length;
    // compute radius in px to position labels outside the center badge
    const width = wheelEl.offsetWidth || wheelEl.getBoundingClientRect().width;
    const height = wheelEl.offsetHeight || wheelEl.getBoundingClientRect().height;
    const radius = Math.min(width, height) / 2;
    const labelDistance = Math.round(radius + 32); // push labels outside the wheel edge
    const labelOffsets = [
        {x: 0, y: 0},     // 60% OFF MONTHLY
        {x: 18, y: -8},   // FREE 1 MONTH
        {x: 22, y: 0},    // 3 MONTHS FREE
        {x: 0, y: 10},    // YEARLY @ ₹7,499
        {x: -8, y: 6},    // YEARLY + 6M PT FREE
        {x: -18, y: 0}    // FREE YEARLY
    ];
    for(let i=0;i<count;i++){
        const s = wheelConfig.sectors[i];
        const slice = 360/count;
        const angle = i*slice;
        const labelWrap = document.createElement('div');
        labelWrap.className = 'sector-label';
        // position around the wheel: rotate the container, then translate outward
        const offset = labelOffsets[i] || {x:0, y:0};
        labelWrap.style.position = 'absolute';
        labelWrap.style.left = '50%';
        labelWrap.style.top = '50%';
        labelWrap.style.transform = `rotate(${angle}deg) translateY(-${labelDistance}px) translate(${offset.x}px, ${offset.y}px)`;
        // inner content stays upright: rotate back by the same angle
        const inner = document.createElement('div');
        inner.className = 'label-inner';
        inner.style.transform = `rotate(${-angle}deg)`;
        // ensure label stacking above sectors but below center badge
        labelWrap.style.zIndex = '2';
        const title = document.createElement('div');
        title.className='sector-title';
        title.innerText = (s.label.split('\n')[0] || '').toUpperCase();
        const sub = document.createElement('div');
        sub.className='sector-sub';
        sub.innerText = s.label.split('\n').slice(1).join(' ');
        inner.appendChild(title);
        if(sub.innerText) inner.appendChild(sub);
        labelWrap.appendChild(inner);
        sectorsContainer.appendChild(labelWrap);
    }
}

function createLEDs(count=28){
    ledRing.innerHTML='';
    for(let i=0;i<count;i++){
        const led = document.createElement('div');
        led.className='led';
        const rot = i*(360/count);
        led.style.transform = `rotate(${rot}deg) translateY(-46%)`;
        ledRing.appendChild(led);
    }
}

function selectSector() {
    // fallback to uniform if probabilities not defined
    if (wheelConfig.probabilities && wheelConfig.probabilities.length === wheelConfig.sectors.length) {
        const r = Math.random();
        let cumulative = 0;
        for (let i = 0; i < wheelConfig.probabilities.length; i += 1) {
            cumulative += wheelConfig.probabilities[i];
            if (r <= cumulative) return i;
        }
        return wheelConfig.probabilities.length - 1;
    }
    return Math.floor(Math.random() * wheelConfig.sectors.length);
}

function generateRewardCode(value) {
    const label = value.toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6).padEnd(6, 'X');
    return `ARMOUR-${label}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function getExpiryDate() {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    return expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
}

function buildWhatsAppMessage() {
    const expiry = getExpiryDate();
    return [
        '🎉 Congratulations!',
        '',
        `🏆 You Won: ${currentReward}`,
        '',
        `Redeemable code: ${currentCode}`,
        '',
        'You’re one step closer to your fitness transformation at Armour Fitness Factory.',
        '',
        `⏰ Claim Before: ${expiry}`,
        '',
        'Your prize has been reserved and is waiting for you.',
        '',
        '📍 Visit Armour Fitness Factory to redeem your reward.',
        '',
        '📞 9347009385 | 7396227023',
        '',
        '⚠️ Terms & Conditions Apply.',
        '',
        '🔥 Claim your prize before it expires!'
    ].join('\n');
}

// openWhatsApp is defined above; reuse that implementation

function redirectHome() {
    window.location.href = wheelConfig.homeUrl;
}

function clearResultTimers() {
    // Prevent old popup timers from firing after a new result or manual close.
    clearTimeout(resultAutoCloseTimer);
    clearTimeout(resultRedirectTimer);
}

function scheduleResultAutoClose() {
    // Auto-expire the winner popup after 2.5 minutes, then return home.
    clearResultTimers();
    resultAutoCloseTimer = setTimeout(() => {
        resultModal.classList.remove('visible');
        redirectHome();
    }, 150000);
}

// NEW: Fetch user's win records from Google Sheet
async function fetchUserWins(mobile) {
    if (!mobile) return [];
    const normalizedMobile = String(mobile).replace(/\D/g, '');
    if (normalizedMobile.length !== 10) return [];
    
    try {
        const url = leadCaptureUrl + '?action=get&mobile=' + encodeURIComponent(normalizedMobile);
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Fetch failed:', response.status);
            return [];
        }
        const data = await response.json();
        return data.records || data || [];
    } catch (error) {
        console.error('Error fetching wins:', error);
        return [];
    }
}

// NEW: Display user's past wins
async function displayUserWinHistory(mobile) {
    const wins = await fetchUserWins(mobile);
    console.log('Fetched wins:', wins);
    
    if (!wins || wins.length === 0) {
        console.log('No wins found for mobile:', mobile);
        return;
    }
    
    // Create win history display element
    let historyContainer = document.getElementById('winHistory');
    if (!historyContainer) {
        historyContainer = document.createElement('div');
        historyContainer.id = 'winHistory';
        historyContainer.style.cssText = 'position:fixed;bottom:100px;right:20px;background:white;border:1px solid #ddd;border-radius:8px;padding:15px;max-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:1000;max-height:300px;overflow-y:auto;font-size:12px;';
        document.body.appendChild(historyContainer);
    }
    
    let html = '<div style="font-weight:bold;margin-bottom:10px;">Your Wins</div>';
    wins.filter(w => w.recordType === 'win' && w.wonOffer).forEach(win => {
        html += `
            <div style="margin-bottom:10px;padding:10px;background:#f5f5f5;border-radius:4px;">
                <div><strong>${win.wonOffer}</strong></div>
                <div>Code: ${win.rewardCode}</div>
                <div style="font-size:11px;color:#666;">${new Date(win.timestamp).toLocaleDateString()}</div>
            </div>
        `;
    });
    
    historyContainer.innerHTML = html;
}

function openWhatsApp() {
    const message = buildWhatsAppMessage();
    const url = `https://wa.me/${wheelConfig.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function recordWinToSheet() {
    if (winRecordSent) return;
    const leadRaw = localStorage.getItem('armourSpinLead');
    if (!leadRaw) return;
    let lead;
    try {
        lead = JSON.parse(leadRaw);
    } catch {
        return;
    }
    currentSpinId = currentSpinId || generateSpinId();
    currentTimestamp = currentTimestamp || new Date().toISOString();
    const wonOffer = currentReward || prizeNameEl.textContent.trim();
    const rewardCode = currentCode || prizeCodeEl.textContent.trim() || generateRewardCode(wonOffer);
    const payload = {
        type: 'win',
        recordType: 'win',
        fullName: lead.fullName || '',
        mobile: String(lead.mobile || '').replace(/\D/g, ''),
        age: lead.age || '',
        gender: lead.gender || '',
        fitnessGoal: lead.fitnessGoal || '',
        currentWeight: lead.currentWeight || '',
        targetWeight: lead.targetWeight || '',
        experience: lead.experience || '',
        startDate: lead.startDate || '',
        contactMethod: lead.contactMethod || '',
        wonOffer: wonOffer,
        rewardCode: rewardCode,
        spinId: currentSpinId,
        timestamp: currentTimestamp
    };

    if (!payload.wonOffer || !payload.rewardCode || !payload.spinId || !payload.timestamp) return;
    winRecordSent = true;
    localStorage.setItem('armourWinRecorded', 'true');
    localStorage.setItem('armourLastWinPayload', JSON.stringify(payload));
    sendToGoogleScript(payload);
}

function isAccessAllowed() {
    try {
        const raw = localStorage.getItem(wheelConfig.accessKey);
        if (!raw) return false;
        const data = JSON.parse(raw);
        return data.allowed && data.expires > Date.now();
    } catch {
        return false;
    }
}

function hasSpinCompleted() {
    return localStorage.getItem(wheelConfig.completedKey) === 'true';
}

function markSpinCompleted() {
    localStorage.setItem(wheelConfig.completedKey, 'true');
}

function showResult(reward) {
    currentReward = reward;
    currentCode = generateRewardCode(reward);
    currentSpinId = generateSpinId();
    currentTimestamp = new Date().toISOString();
    prizeNameEl.textContent = reward;
    prizeCodeEl.textContent = currentCode;
    expiryDateEl.textContent = getExpiryDate();
    resultModal.classList.add('visible');
    confettiBurst();
    // Persist completion data so a refresh cannot reopen the winner popup.
    localStorage.setItem('armourWinData', JSON.stringify({ wonOffer: currentReward, rewardCode: currentCode, spinId: currentSpinId, timestamp: currentTimestamp }));
    scheduleResultAutoClose();
    recordWinToSheet();
}

function hideResult() {
    // Manual close returns the user home after a short claim-review window.
    clearResultTimers();
    resultModal.classList.remove('visible');
    resultRedirectTimer = setTimeout(redirectHome, 20000);
}

function createConfettiPiece() {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = '-24px';
    piece.style.background = ['#FF5A1F', '#FFB800', '#F97316', '#F59E0B'][Math.floor(Math.random() * 4)];
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    confettiRoot.appendChild(piece);
    setTimeout(() => piece.remove(), 2200);
}

function confettiBurst() {
    for (let i = 0; i < 18; i += 1) {
        setTimeout(createConfettiPiece, i * 50);
    }
}

function spinWheel() {
    if (isSpinning || hasSpun) return;
    if (!isAccessAllowed()) {
        redirectHome();
        return;
    }
    isSpinning = true;
    spinButton.disabled = true;
    spinButton.textContent = 'SPINNING...';

    const targetIndex = selectSector();
    const sectorCount = wheelConfig.sectors.length;
    const rounds = Math.floor(Math.random()*4)+6; // 6-9 rounds
    const extra = Math.random()*360;
    const finalDeg = rounds*360 + (360 - (targetIndex * (360/sectorCount) + (360/sectorCount)/2)) + extra;
    const duration = 4800 + Math.random()*1800;
    wheelEl.style.transition = `transform ${duration}ms cubic-bezier(.08,.9,.12,1)`;
    currentRotation = (currentRotation + finalDeg) % 360000;
    wheelEl.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(()=>{
        hasSpun = true;
        markSpinCompleted();
        isSpinning = false;
        spinButton.textContent = 'SPIN COMPLETED';
        const prize = wheelConfig.sectors[targetIndex].label;
        showResult(prize);
    }, duration+60);
}

function init() {
    if (hasSpinCompleted()) {
        // A completed spin must never show the popup again after refresh/reload.
        redirectHome();
        return;
    }
    if (!isAccessAllowed()) {
        redirectHome();
        return;
    }
    createSectors();
    createLEDs(28);
    spinButton.addEventListener('click', spinWheel);
    closeModal.addEventListener('click', hideResult);
    claimButton.addEventListener('click', openWhatsApp);
    whatsappButton.addEventListener('click', openWhatsApp);
}

init();
