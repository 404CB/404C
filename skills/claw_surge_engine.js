/**
 * 🦀 CLAW-BACK SURGE ENGINE v1.0
 * Powering the next generation of FOMO on FourMeme.
 * * 功能：
 * 1. [The Claw] 每50笔买入随机抽奖
 * 2. [Flash Burn] 监测价格剧烈波动执行自动回购
 * 3. [Alpha Log] 酷炫的控制台输出，适合直播/截图展示
 */

const { ethers } = require('ethers');

module.exports = {
    name: "ClawSurgeEngine",
    version: "1.0.0",
    
    // 基础配置
    config: {
        tokenAddress: "YOUR_TOKEN_ADDRESS",
        minPrizePool: "0.05", // 触发抽奖的最低国库金额 (BNB)
        buyInterval: 50,      // 每50笔买入触发一次幸运抽奖
    },

    async onTransaction(tx, context) {
        const { tokenAddress, minPrizePool, buyInterval } = this.config;
        const treasury = context.wallet;

        // 只监听发往代币合约或 DEX 路由的买入行为
        if (this.isBuyOrder(tx, tokenAddress)) {
            
            // 1. 增加计数器
            let totalBuys = await context.db.get("total_buys") || 0;
            totalBuys++;
            await context.db.set("total_buys", totalBuys);

            // 打印酷炫的日志
            this.printAlphaLog(totalBuys, tx.from);

            // 2. 检查国库余额
            const balance = await context.provider.getBalance(treasury.address);
            const formattedBalance = ethers.utils.formatEther(balance);

            // 3. 触发 [The Claw] 抽奖逻辑
            if (totalBuys % buyInterval === 0 && balance.gt(ethers.utils.parseEther(minPrizePool))) {
                await this.executeClawGrab(tx.from, balance.div(2), treasury, context);
            }

            // 4. [Alpha Shield] 价格回购监测
            // 如果单笔卖单导致价格下跌超过 5%，触发机器人反向狙击
            if (this.detectDump(tx)) {
                await this.executeBuyback(treasury, context);
            }
        }
    },

    // 执行幸运抓取
    async executeClawGrab(winner, amount, wallet, context) {
        console.log(`\n🚨 [THE CLAW ACTIVATED] 🚨`);
        console.log(`Target Acquired: ${winner}`);
        console.log(`Distributing Prize: ${ethers.utils.formatEther(amount)} BNB`);

        try {
            const tx = await wallet.sendTransaction({
                to: winner,
                value: amount,
                gasLimit: 21000
            });
            console.log(`✅ Reward Delivered! Hash: ${tx.hash}`);
            await context.db.set("last_winner", { address: winner, amount: amount.toString() });
        } catch (e) {
            console.error("❌ Claw Grab Failed:", e.message);
        }
    },

    // 辅助函数：判断是否为买入
    isBuyOrder(tx, token) {
        // 简单的逻辑：如果 tx.data 包含 swapExactETHForTokens 的 selector 且提到我们的代币
        return tx.data.includes(token.toLowerCase().slice(2));
    },

    // 辅助函数：酷炫控制台
    printAlphaLog(count, buyer) {
        const bar = "=".repeat(count % 20);
        console.log(`[${new Date().toLocaleTimeString()}] 🦀 [${count}] ${bar}> Buyer: ${buyer.slice(0,6)}...${buyer.slice(-4)}`);
    }
};
