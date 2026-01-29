let currentRoundCards = [null, null, null, null, null, null];
let inputStep = 0;
let allHistoryData = []; 
let activeBet = null; 

const cardValueMap = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 0, 'J': 0, 'Q': 0, 'K': 0
};

// 輔助函式：將牌面轉為點數（補回這段）
function getVal(idx) {
    const card = currentRoundCards[idx];
    return (!card || card === "無") ? 0 : cardValueMap[card];
}

function inputCard(val) {
    if (inputStep >= 6) return;
    currentRoundCards[inputStep] = val;
    inputStep++;
    renderSlots();
    if (inputStep === 6) setTimeout(finalizeRound, 300);
}

function handleSkipOrSettle() {
    if (inputStep === 4) {
        currentRoundCards[4] = "無";
        inputStep = 5;
        renderSlots();
    } else if (inputStep >= 4) {
        finalizeRound();
    }
}

function finalizeRound() {
    if (inputStep < 4) return;

    // 1. 計算當前局點數
    const pPoints = (getVal(0) + getVal(1) + getVal(4)) % 10;
    const bPoints = (getVal(2) + getVal(3) + getVal(5)) % 10;
    
    let actualResult = "和";
    if (pPoints > bPoints) actualResult = "閒";
    else if (bPoints > pPoints) actualResult = "莊";

    // 2. 紀錄配對 (上一局建議 vs 這一局結果)
    if (activeBet !== null) {
        allHistoryData.push({
            roundNum: allHistoryData.length + 1,
            recommendation: activeBet.side,
            result: actualResult,
            isCorrect: activeBet.side === actualResult,
            isTie: actualResult === "和"
        });
    }

    // 3. 計算下一局建議
    const runValue = pPoints + bPoints;
    let initialSide = (runValue >= 1 && runValue <= 9) ? "閒" : "莊";
    
    let isFlipped = false;
    const hasExtra = (currentRoundCards[4] !== null && currentRoundCards[4] !== "無") || 
                     (currentRoundCards[5] !== null && currentRoundCards[5] !== "無");
    const isNaturalWin = !hasExtra;
    const firstFour = [currentRoundCards[0], currentRoundCards[1], currentRoundCards[2], currentRoundCards[3]];
    const hasFaceCards = firstFour.some(c => ['J', 'Q', 'K'].includes(c));

    if (hasExtra || (isNaturalWin && !hasFaceCards)) isFlipped = true;
    
    const nextSide = isFlipped ? (initialSide === "閒" ? "莊" : "閒") : initialSide;

    // 4. 更新 UI 與重置
    activeBet = { side: nextSide };
    const recElement = document.getElementById('recommendation');
    recElement.innerText = `下注${nextSide} ${nextSide === '閒' ? '🔵' : '🔴'}`;
    recElement.className = nextSide === '閒' ? 'text-p' : 'text-b';

    updateHistoryUI(); 
    resetRound();
}

function updateHistoryUI() {
    const list = document.getElementById('historyList');
    list.innerHTML = "";

    for (let i = allHistoryData.length - 1; i >= 0; i--) {
        const data = allHistoryData[i];
        const div = document.createElement('div');
        const colorClass = data.recommendation === '閒' ? 'pred-p' : 'pred-b';
        const emoji = data.recommendation === '閒' ? '🔵' : '🔴';
        
        let statusText = "● 不準";
        let statusColor = "#e74c3c"; 

        if (data.isTie) {
            statusText = "● 和";
            statusColor = "#95a5a6"; 
        } else if (data.isCorrect) {
            statusText = "● 準";
            statusColor = "#2ecc71"; 
        }

        div.className = 'history-item';
        div.innerHTML = `
            <div style="font-weight: bold;">第 ${data.roundNum} 局</div>
            <div class="${colorClass}">建議：下注${data.recommendation} ${emoji}</div>
            <div style="color: #eee;">結果：開${data.result}</div>
            <span style="float:right; font-size:12px; color:${statusColor}">
                ${statusText}
            </span>
            <div style="clear:both"></div>
        `;
        list.appendChild(div);
    }
    document.getElementById('count').innerText = allHistoryData.length;
}

function renderSlots() {
    const slots = document.querySelectorAll('.slot');
    slots.forEach((slot, index) => {
        const val = currentRoundCards[index];
        slot.innerText = val === "無" ? "—" : (val || "");
        slot.classList.toggle('active', index === inputStep);
        slot.classList.toggle('skipped', val === "無");
    });
}

function resetRound() {
    currentRoundCards = [null, null, null, null, null, null];
    inputStep = 0;
    renderSlots();
}

function undo() {
    if (inputStep > 0) {
        inputStep--;
        currentRoundCards[inputStep] = null;
        renderSlots();
    }
}

function clearHistory() {
    if(confirm("確定要清空紀錄嗎？")) {
        allHistoryData = [];
        activeBet = null;
        document.getElementById('recommendation').innerText = "—";
        document.getElementById('recommendation').className = "";
        updateHistoryUI();
    }
}