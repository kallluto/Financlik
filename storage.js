// storage.js - CRUD-операции через Supabase
const supabase = require('./db')

// имя таблицы в базе данных
const TABLE = 'transactions'

// получить все транзакции пользователя (изоляция по user_id)
async function getAll(userId) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true })
    if (error) throw error
    return data
  } catch (e) {
    throw new Error('Не удалось получить список транзакций: ' + e.message)
  }
}

// добавить новую транзакцию и вернуть созданную запись
async function insert(userId, type, category, amount, comment) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ user_id: userId, type, category, amount, comment: comment || '' })
      .select()
      .single()
    if (error) throw error
    return data
  } catch (e) {
    throw new Error('Не удалось добавить транзакцию: ' + e.message)
  }
}

// удалить транзакцию по id - только свою (фильтр по user_id)
async function remove(userId, id) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('id', id)
      .select()
    if (error) throw error
    // если ничего не удалили - значит id не найден или чужой
    if (!data || data.length === 0) throw new Error('транзакция не найдена')
    return data[0]
  } catch (e) {
    throw new Error('Не удалось удалить транзакцию: ' + e.message)
  }
}

// обновить поля транзакции - только свою (фильтр по user_id)
async function update(userId, id, fields) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update(fields)
      .eq('user_id', userId)
      .eq('id', id)
      .select()
    if (error) throw error
    // если ничего не обновили - значит id не найден или чужой
    if (!data || data.length === 0) throw new Error('транзакция не найдена')
    return data[0]
  } catch (e) {
    throw new Error('Не удалось обновить транзакцию: ' + e.message)
  }
}

// агрегированная статистика: доходы, расходы, баланс, разбивка по категориям
async function stats(userId) {
  try {
    const rows = await getAll(userId)
    let income = 0
    let expense = 0
    const byCategory = {}
    for (const r of rows) {
      // numeric из Postgres приходит строкой - приводим к числу
      const amount = Number(r.amount)
      if (r.type === 'income') {
        income += amount
      } else {
        expense += amount
        byCategory[r.category] = (byCategory[r.category] || 0) + amount
      }
    }
    return { income, expense, balance: income - expense, byCategory }
  } catch (e) {
    throw new Error('Не удалось посчитать статистику: ' + e.message)
  }
}

module.exports = { getAll, insert, remove, update, stats }
