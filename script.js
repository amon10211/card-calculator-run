// ==========================================
// 核心變數與初始化
// ==========================================
let currentRoundCards = [null, null, null, null, null, null];
let inputStep = 0;
let allHistoryData = []; 
let activeBet = null; 
let shoeScore = 0; // 牌靴累計權重分數
let isRoundFinalized = false; // 新增一個標記，判斷當前局是否已結算

// 牌組消耗統計
let cardCounts = {
    'A': 0, '2': 0, '3': 0, '4': 0, '5': 0, 
    '6': 0, '7': 0, '8': 0, '9': 0, 
    '10': 0, 'J': 0, 'Q': 0, 'K': 0
};

// 點數轉換表
const cardValueMap = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 0, 'J': 0, 'Q': 0, 'K': 0
};

// 權重分析表 (Effect of Removal)
// 小牌出多利莊 (+1)，大牌出多利閒 (-1)
const weightMap = {
    'A': 0, '2': 1, '3': 1, '4': 1, '5': 1,
    '6': -1, '7': -1, '8': -1, '9': -1,
    '10': 0, 'J': 0, 'Q': 0, 'K': 0
};

// ==========================================
// 輸入與統計邏輯
// ==========================================

// 修改計數器初始化函式，明確指定順序：A, 2, 3...
function initCounters() {
    const container = document.getElementById('cardCounters');
    if (!container) return;
    container.innerHTML = ""; 
    
    // 定義顯示順序：A 在最前面
    const order = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    order.forEach(key => {
        const div = document.createElement('div');
        div.className = 'counter-box';
        div.innerHTML = `${key}<span class="val" id="cnt-${key}">0</span>`;
        container.appendChild(div);
    });
}

function updateCardStats() {
    let small = 0, big = 0, zero = 0;
    
    Object.keys(cardCounts).forEach(key => {
        const count = cardCounts[key];
        const el = document.getElementById(`cnt-${key}`);
        if(el) el.innerText = count;
        
        if (['A','2','3','4','5'].includes(key)) small += count;
        else if (['6','7','8','9'].includes(key)) big += count;
        else zero += count;
    });

    const total = small + big + zero || 1;
    
    // 更新百分比顯示
    if(document.getElementById('smallPercent')) {
        document.getElementById('smallPercent').innerText = Math.round(small/total*100) + '%';
        document.getElementById('bigPercent').innerText = Math.round(big/total*100) + '%';
        document.getElementById('zeroPercent').innerText = Math.round(zero/total*100) + '%';
    }

    // 更新進度條
    if(document.getElementById('smallBar')) document.getElementById('smallBar').style.width = (small / total * 100) + '%';
    if(document.getElementById('bigBar')) document.getElementById('bigBar').style.width = (big / total * 100) + '%';
    if(document.getElementById('zeroBar')) document.getElementById('zeroBar').style.width = (zero / total * 100) + '%';
}

function inputCard(val) {
    // 簡化的判斷：如果已經結算過，按數字鍵就自動開啟新局
    if (isRoundFinalized || inputStep >= 6) {
        resetRound();
    }
    
    currentRoundCards[inputStep] = val;
    cardCounts[val]++; 
    shoeScore += weightMap[val]; 
    
    inputStep++;
    renderSlots();
    updateCardStats();

    // 填滿 6 張自動結算
    if (inputStep === 6) {
        // 為了保險，我們把 timeout 存起來，避免重複執行
        if (window.roundTimer) clearTimeout(window.roundTimer);
        window.roundTimer = setTimeout(finalizeRound, 300);
    }
}

// ==========================================
// 計算與結算邏輯 (核心算法)
// ==========================================

function getVal(idx) {
    const card = currentRoundCards[idx];
    return (!card || card === "無") ? 0 : cardValueMap[card];
}

function finalizeRound() {
    if (inputStep < 4 || isRoundFinalized) return; // 防止重複執行

    const pPoints = (getVal(0) + getVal(1) + getVal(4)) % 10;
    const bPoints = (getVal(2) + getVal(3) + getVal(5)) % 10;
    
    let actualResult = "和";
    if (pPoints > bPoints) actualResult = "閒";
    else if (bPoints > pPoints) actualResult = "莊";

    if (activeBet !== null) {
        allHistoryData.push({
            roundNum: allHistoryData.length + 1,
            recommendation: activeBet.side,
            result: actualResult,
            isCorrect: activeBet.side === actualResult,
            isTie: actualResult === "和"
        });
    }

    const runValue = pPoints + bPoints;
    let finalSide = (runValue >= 1 && runValue <= 9) ? "閒" : "莊";
    
    let isFlipped = false;
    const hasExtra = (currentRoundCards[4] !== null && currentRoundCards[4] !== "無") || 
                     (currentRoundCards[5] !== null && currentRoundCards[5] !== "無");
    const isNaturalWin = !hasExtra;
    const firstFour = [currentRoundCards[0], currentRoundCards[1], currentRoundCards[2], currentRoundCards[3]];
    const hasFaceCards = firstFour.some(c => ['J', 'Q', 'K'].includes(c));

    if (hasExtra || (isNaturalWin && !hasFaceCards)) isFlipped = true;
    if (isFlipped) finalSide = (finalSide === "閒" ? "莊" : "閒");

    let strengthNote = "";
    if (shoeScore >= 5 && finalSide === "莊") strengthNote = " 🔥 (強力建議)";
    else if (shoeScore <= -5 && finalSide === "閒") strengthNote = " 🔥 (強力建議)";
    else if (shoeScore >= 5 && finalSide === "閒") strengthNote = " ⚠️ (牌靴偏莊)";
    else if (shoeScore <= -5 && finalSide === "莊") strengthNote = " ⚠️ (牌靴偏閒)";

    activeBet = { side: finalSide };
    
    const recElement = document.getElementById('recommendation');
    recElement.innerText = `下注${finalSide}${strengthNote} ${finalSide === '閒' ? '🔵' : '🔴'}`;
    recElement.className = finalSide === '閒' ? 'text-p' : 'text-b';

    updateHistoryUI();
    
    // 更新狀態標記
    inputStep = 6; 
    isRoundFinalized = true; 
}

// ==========================================
// UI 渲染與控制功能
// ==========================================

function renderSlots() {
    const slots = document.querySelectorAll('.slot');
    slots.forEach((slot, index) => {
        const val = currentRoundCards[index];
        slot.innerText = val === "無" ? "—" : (val || "");
        slot.classList.toggle('active', index === inputStep);
        slot.classList.toggle('skipped', val === "無");
    });
}

function updateHistoryUI() {
    const list = document.getElementById('historyList');
    if(!list) return;
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

function handleSkipOrSettle() {
    if (inputStep === 4) {
        // 第一下：閒家不補牌，跳過第 5 個位置 (閒3)
        currentRoundCards[4] = "無";
        inputStep = 5; 
        renderSlots();
        // 注意：這裡不呼叫 finalizeRound，讓使用者可以繼續點數字或再按一次不補牌
    } else if (inputStep === 5) {
        // 第二下：莊家不補牌，跳過第 6 個位置 (莊3)
        currentRoundCards[5] = "無";
        inputStep = 6;
        renderSlots();
        finalizeRound(); // 這時才結算
    } else if (inputStep >= 6) {
        // 防呆：如果已經結算了，再按一次則重置開啟新局
        resetRound();
    }
}

function undo() {
    if (inputStep > 0) {
        inputStep--;
        const lastCard = currentRoundCards[inputStep];
        if (lastCard && lastCard !== "無") {
            cardCounts[lastCard]--;
            shoeScore -= weightMap[lastCard]; 
        }
        currentRoundCards[inputStep] = null;
        renderSlots();
        updateCardStats();
    }
}

function resetRound() {
    currentRoundCards = [null, null, null, null, null, null];
    inputStep = 0;
    isRoundFinalized = false; // 重置標記
    if (window.roundTimer) clearTimeout(window.roundTimer); // 清除定時器防止意外觸發
    renderSlots();
}

function clearHistory() {
    if(confirm("確定要清空所有紀錄與算牌統計嗎？")) {
        allHistoryData = [];
        activeBet = null;
        shoeScore = 0;
        Object.keys(cardCounts).forEach(k => cardCounts[k] = 0);
        document.getElementById('recommendation').innerText = "—";
        document.getElementById('recommendation').className = "";
        updateCardStats();
        updateHistoryUI();
        resetRound();
    }
}

// 初始化
initCounters();
updateCardStats();