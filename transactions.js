// transactions.js - бизнес-логика: добавление, удаление, фильтрация, статистика
const storage = require('./storage')

// доступные категории в зависимости от типа операции
const CATEGORIES = {
  income: ['Зарплата', 'Другое'],
  expense: ['Еда', 'Транспорт', 'Жильё', 'Развлечения', 'Другое'],
}

// добавить транзакцию с валидацией входных данных
async function addTransaction(userId, type, category, amount, comment) {
  if (type !== 'income' && type !== 'expense') {
    throw new Error('Неверный тип операции')
  }
  const sum = Number(amount)
  if (isNaN(sum) || sum <= 0) {
    throw new Error('Сумма должна быть числом больше 0')
  }
  return storage.insert(userId, type, category, sum, comment)
}

// получить список всех транзакций пользователя
async function listTransactions(userId) {
  return storage.getAll(userId)
}

// удалить транзакцию пользователя по id
async function deleteTransaction(userId, id) {
  return storage.remove(userId, id)
}

// обновить транзакцию пользователя по id
async function editTransaction(userId, id, fields) {
  return storage.update(userId, id, fields)
}

// посчитать статистику пользователя
async function getStats(userId) {
  return storage.stats(userId)
}

// форматирование одной строки транзакции для вывода в чат
function formatLine(t) {
  const typeLabel = t.type === 'income' ? '💰 Доход' : '💸 Расход'
  const comment = t.comment ? t.comment : '-'
  return `#${t.id} | ${typeLabel} | ${t.category} | ${Number(t.amount).toFixed(2)} ₽ | ${t.date} | ${comment}`
}

module.exports = {
  CATEGORIES,
  addTransaction,
  listTransactions,
  deleteTransaction,
  editTransaction,
  getStats,
  formatLine,
}
