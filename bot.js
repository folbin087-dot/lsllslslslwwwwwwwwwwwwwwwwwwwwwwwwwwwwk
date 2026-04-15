#!/usr/bin/env node

/**
 * Plaid Casino Telegram Bot
 * Handles user interactions, payments, and casino games
 */

require('dotenv').config({ path: '.env.local' });

const TelegramBot = require('node-telegram-bot-api');

// Bot configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'plaid_casino_bot';
const CASINO_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://plaidcas.live';
const CASINO_NAME = process.env.CASINO_NAME || 'Plaid Casino';

// Admin settings
const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [];
const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS ? process.env.SUPER_ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [];

// Casino settings
const MIN_BET = parseInt(process.env.MIN_BET) || 10;
const MAX_BET = parseInt(process.env.MAX_BET) || 500000;
const DEFAULT_BALANCE = parseInt(process.env.DEFAULT_BALANCE) || 0;

// Payment settings
const TON_WALLET = process.env.CASINO_TON_WALLET;
const SBP_PHONE = process.env.SBP_PHONE_NUMBER;
const SBP_BANK = process.env.SBP_BANK_NAME;
const MIN_DEPOSIT = parseInt(process.env.MIN_DEPOSIT) || 50;
const MAX_DEPOSIT = parseInt(process.env.MAX_DEPOSIT) || 50000;

// Feature flags
const ENABLE_TON_PAYMENTS = process.env.ENABLE_TON_PAYMENTS === 'true';
const ENABLE_SBP_PAYMENTS = process.env.ENABLE_SBP_PAYMENTS === 'true';
const ENABLE_BONUSES = process.env.ENABLE_BONUSES === 'true';
const ENABLE_REFERRALS = process.env.ENABLE_REFERRALS === 'true';
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';

if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env.local');
    process.exit(1);
}

// Create bot instance
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Plaid Casino Telegram Bot starting...');
console.log('🌐 Casino URL:', CASINO_URL);
console.log('👑 Admins:', ADMIN_IDS);
console.log('🔱 Super Admins:', SUPER_ADMIN_IDS);
console.log('💰 Min/Max Bet:', MIN_BET, '/', MAX_BET);
console.log('💳 TON Payments:', ENABLE_TON_PAYMENTS ? '✅' : '❌');
console.log('🏦 SBP Payments:', ENABLE_SBP_PAYMENTS ? '✅' : '❌');

// Helper functions
const isAdmin = (userId) => ADMIN_IDS.includes(userId) || SUPER_ADMIN_IDS.includes(userId);
const isSuperAdmin = (userId) => SUPER_ADMIN_IDS.includes(userId);

// Maintenance mode check
const checkMaintenance = (msg) => {
    if (MAINTENANCE_MODE && !isAdmin(msg.from.id)) {
        bot.sendMessage(msg.chat.id, '🔧 Казино временно на техническом обслуживании. Попробуйте позже.');
        return true;
    }
    return false;
};

// Start command
bot.onText(/\/start/, (msg) => {
    if (checkMaintenance(msg)) return;
    
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'Игрок';
    const userId = msg.from.id;
    
    const isUserAdmin = isAdmin(userId);
    const adminBadge = isUserAdmin ? '👑' : '';
    
    const welcomeMessage = `🎰 Добро пожаловать в ${CASINO_NAME}, ${firstName}! ${adminBadge}

🎮 **Доступные игры:**
• 🎲 Dice - Классические кости
• 🃏 Blackjack - Карточная игра 21  
• 🎯 Roulette - Европейская рулетка
• 💎 Mines - Сапёр с выигрышами
• 🎪 Plinko - Шарики и призы
• 🎡 Wheel - Колесо фортуны
• ✈️ Aviatrix - Краш-игра

💰 **Ставки:** от ${MIN_BET}₽ до ${MAX_BET}₽
${ENABLE_BONUSES ? '🎁 **Бонусы и промокоды**' : ''}
${ENABLE_REFERRALS ? '👥 **Реферальная программа**' : ''}

💳 **Способы пополнения:**
${ENABLE_TON_PAYMENTS ? '• 🪙 TON Wallet' : ''}
${ENABLE_SBP_PAYMENTS ? '• 🏦 СБП (' + SBP_BANK + ')' : ''}
• 💳 Банковские карты

👇 **Начать играть:**`;

    const keyboard = [
        [
            {
                text: '🎰 Играть в казино',
                web_app: { url: CASINO_URL }
            }
        ]
    ];

    if (ENABLE_BONUSES) {
        keyboard.push([
            {
                text: '💰 Бонусы',
                web_app: { url: `${CASINO_URL}/bonuses` }
            },
            {
                text: '💳 Депозит',
                web_app: { url: `${CASINO_URL}/deposit` }
            }
        ]);
    }

    if (ENABLE_REFERRALS) {
        keyboard.push([
            {
                text: '👥 Рефералы',
                web_app: { url: `${CASINO_URL}/referral` }
            },
            {
                text: '👤 Профиль',
                web_app: { url: `${CASINO_URL}/profile` }
            }
        ]);
    }

    // Admin panel for admins
    if (isUserAdmin) {
        keyboard.push([
            {
                text: '👑 Админ панель',
                web_app: { url: `${CASINO_URL}/admin` }
            }
        ]);
    }

    const options = {
        reply_markup: {
            inline_keyboard: keyboard
        },
        parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, welcomeMessage, options);
});

// Casino command
bot.onText(/\/casino/, (msg) => {
    if (checkMaintenance(msg)) return;
    
    const chatId = msg.chat.id;
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '🎰 Открыть казино',
                        web_app: { url: CASINO_URL }
                    }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, `🎰 Добро пожаловать в ${CASINO_NAME}!`, options);
});

// Balance command
bot.onText(/\/balance/, (msg) => {
    if (checkMaintenance(msg)) return;
    
    const chatId = msg.chat.id;
    
    // TODO: Get actual balance from database
    const balance = DEFAULT_BALANCE;
    
    const message = `💰 **Ваш баланс:** ${balance}₽

💳 **Пополнить баланс:**
${ENABLE_TON_PAYMENTS ? '• 🪙 TON Wallet' : ''}
${ENABLE_SBP_PAYMENTS ? '• 🏦 СБП - ' + SBP_PHONE : ''}
• 💳 Банковские карты

📊 **Лимиты:**
• Минимальный депозит: ${MIN_DEPOSIT}₽
• Максимальный депозит: ${MAX_DEPOSIT}₽`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '💳 Пополнить',
                        web_app: { url: `${CASINO_URL}/deposit` }
                    }
                ]
            ]
        },
        parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, message, options);
});

// Bonus command
if (ENABLE_BONUSES) {
    bot.onText(/\/bonus/, (msg) => {
        if (checkMaintenance(msg)) return;
        
        const chatId = msg.chat.id;
        
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '💰 Получить бонус',
                            web_app: { url: `${CASINO_URL}/bonuses` }
                        }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, '💰 Доступные бонусы и промокоды:', options);
    });
}

// Referral command
if (ENABLE_REFERRALS) {
    bot.onText(/\/ref/, (msg) => {
        if (checkMaintenance(msg)) return;
        
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
        
        const message = `👥 **Реферальная программа**

🔗 **Ваша ссылка:**
\`${referralLink}\`

💰 **Условия:**
• Получайте 10% с депозитов рефералов
• Бонус начисляется автоматически
• Без ограничений по количеству

📊 **Статистика:** 0 рефералов
💵 **Заработано:** 0₽`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '👥 Подробнее',
                            web_app: { url: `${CASINO_URL}/referral` }
                        }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        };

        bot.sendMessage(chatId, message, options);
    });
}

// Support command
bot.onText(/\/support/, (msg) => {
    const chatId = msg.chat.id;
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '🆘 Поддержка',
                        web_app: { url: `${CASINO_URL}/support` }
                    }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, '🆘 Нужна помощь? Обратитесь в поддержку:', options);
});

// Help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const isUserAdmin = isAdmin(userId);
    
    let helpMessage = `🤖 **${CASINO_NAME} Bot - Команды:**

🎰 /start - Главное меню
🎮 /casino - Открыть казино
💰 /balance - Проверить баланс
${ENABLE_BONUSES ? '🎁 /bonus - Получить бонус' : ''}
${ENABLE_REFERRALS ? '👥 /ref - Реферальная ссылка' : ''}
🆘 /support - Поддержка
❓ /help - Эта справка

💡 **Используйте кнопки для быстрого доступа!**`;

    if (isUserAdmin) {
        helpMessage += `

👑 **Админ команды:**
📊 /stats - Статистика казино
👥 /users - Управление пользователями
🔧 /maintenance - Режим обслуживания`;
    }

    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Admin commands
if (ADMIN_IDS.length > 0) {
    // Stats command for admins
    bot.onText(/\/stats/, (msg) => {
        const userId = msg.from.id;
        if (!isAdmin(userId)) {
            bot.sendMessage(msg.chat.id, '❌ У вас нет прав для выполнения этой команды.');
            return;
        }

        const chatId = msg.chat.id;
        
        // TODO: Get actual stats from database
        const stats = `📊 **Статистика казино:**

👥 **Пользователи:** 0
💰 **Общий баланс:** 0₽
🎮 **Игр сыграно:** 0
💸 **Выплачено:** 0₽
📈 **Прибыль:** 0₽

⚙️ **Настройки:**
• Мин. ставка: ${MIN_BET}₽
• Макс. ставка: ${MAX_BET}₽
• Режим обслуживания: ${MAINTENANCE_MODE ? '🔧 Включен' : '✅ Выключен'}`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '👑 Админ панель',
                            web_app: { url: `${CASINO_URL}/admin` }
                        }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        };

        bot.sendMessage(chatId, stats, options);
    });

    // Maintenance command for super admins
    bot.onText(/\/maintenance/, (msg) => {
        const userId = msg.from.id;
        if (!isSuperAdmin(userId)) {
            bot.sendMessage(msg.chat.id, '❌ У вас нет прав для выполнения этой команды.');
            return;
        }

        const chatId = msg.chat.id;
        const currentMode = MAINTENANCE_MODE ? 'включен' : 'выключен';
        
        bot.sendMessage(chatId, `🔧 Режим обслуживания сейчас **${currentMode}**\n\nДля изменения используйте админ панель.`, { parse_mode: 'Markdown' });
    });
}

// Handle callback queries
bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    
    bot.answerCallbackQuery(callbackQuery.id);
    
    switch (data) {
        case 'play_casino':
            bot.sendMessage(message.chat.id, '🎰 Открываю казино...', {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '🎰 Играть',
                                web_app: { url: CASINO_URL }
                            }
                        ]
                    ]
                }
            });
            break;
    }
});

// Error handling
bot.on('error', (error) => {
    console.error('❌ Bot error:', error);
});

bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Bot shutting down...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Bot shutting down...');
    bot.stopPolling();
    process.exit(0);
});

console.log('✅ Plaid Casino Telegram Bot is running!');
console.log('📱 Users can now interact with @' + BOT_USERNAME);