import { BENCHMARK_TASKS } from './tasks'
import type { BenchmarkTask } from './types'

export const BATTLE_CATEGORIES = [
  { id: 'logic', label: 'Логика и ограничения' },
  { id: 'arithmetic', label: 'Арифметика' },
  { id: 'number-theory', label: 'Числа и остатки' },
  { id: 'counting', label: 'Подсчёт и комбинации' },
  { id: 'graphs', label: 'Графы и алгоритмы' },
  { id: 'games', label: 'Игровая стратегия' },
] as const

export type BattleCategoryId = (typeof BATTLE_CATEGORIES)[number]['id']
export type BattleTask = BenchmarkTask & { categoryId: BattleCategoryId }

const originalCategories: Record<string, BattleCategoryId> = {
  logic: 'logic',
  graph: 'graphs',
  counting: 'counting',
  modular: 'number-theory',
  game: 'games',
  diophantine: 'arithmetic',
}

function numericTask(
  id: string,
  title: string,
  categoryId: BattleCategoryId,
  question: string,
  answerKey: string,
): BattleTask {
  return { id, title, categoryId, question, answerKey, answerShape: 'integer' }
}

const additionalTasks: BattleTask[] = [
  numericTask('logic-queue', 'Очередь', 'logic',
    'Аня, Борис и Вера стоят в очереди. Борис стоит сразу после Ани. Вера не стоит первой. На каком месте стоит Борис? Считайте первое место позицией 1.', '2'),
  numericTask('logic-reports', 'Порядок докладов', 'logic',
    'Доклады A, B, C и D идут в некотором порядке. D идёт раньше A, A идёт раньше C, а B идёт сразу после A. На каком месте идёт D? Считайте первое место позицией 1.', '1'),
  numericTask('logic-sets', 'Логические следствия', 'logic',
    'Все инженеры знают Python. Некоторые менеджеры — инженеры. Какое наименьшее число менеджеров гарантированно знает Python?', '1'),
  numericTask('logic-conditional', 'Условие и отрицание', 'logic',
    'Если дверь открыта, горит лампа. Сейчас лампа не горит. Запишите 1, если из этого обязательно следует, что дверь закрыта, и 0 в противном случае.', '1'),
  numericTask('logic-truth-count', 'Ровно два истинных', 'logic',
    'Число n — одно из 2, 3 или 5. Верны ровно два утверждения: «n чётное», «n больше 3», «n равно 2». Чему равно n?', '2'),

  numericTask('arithmetic-equation', 'Линейное уравнение', 'arithmetic',
    'Решите уравнение 5x − 7 = 28. Чему равно x?', '7'),
  numericTask('arithmetic-discount', 'Скидка', 'arithmetic',
    'Товар стоил 800 ₽. Цену снизили на 15%. Какова новая цена в рублях?', '680'),
  numericTask('arithmetic-ratio', 'Отношение частей', 'arithmetic',
    'Два числа относятся как 2:3, а их сумма равна 40. Чему равно меньшее число?', '16'),
  numericTask('arithmetic-average', 'Среднее значение', 'arithmetic',
    'Найдите среднее арифметическое чисел 7, 9 и 14.', '10'),
  numericTask('arithmetic-printers', 'Производительность', 'arithmetic',
    'Три одинаковых принтера печатают 180 страниц за 6 минут. Сколько страниц напечатают пять таких принтеров за 4 минуты?', '200'),

  numericTask('number-gcd', 'Наибольший общий делитель', 'number-theory',
    'Чему равен НОД чисел 84 и 126?', '42'),
  numericTask('number-last-digit', 'Последняя цифра степени', 'number-theory',
    'Какова последняя цифра числа 7^202?', '9'),
  numericTask('number-mod-seven', 'Остаток по модулю 7', 'number-theory',
    'Какой остаток даёт 2^10 при делении на 7?', '2'),
  numericTask('number-lcm', 'Наименьшее общее кратное', 'number-theory',
    'Какое наименьшее целое число больше 100 делится и на 6, и на 8?', '120'),
  numericTask('number-divisors', 'Количество делителей', 'number-theory',
    'Сколько положительных делителей у числа 72?', '12'),

  numericTask('count-two-digit', 'Двузначные числа', 'counting',
    'Сколько существует двузначных чисел с различными цифрами?', '81'),
  numericTask('count-choose-two', 'Выбор пары', 'counting',
    'Сколькими способами можно выбрать двух человек из группы из семи человек?', '21'),
  numericTask('count-books', 'Перестановки книг', 'counting',
    'Сколькими способами можно расставить в ряд четыре разные книги?', '24'),
  numericTask('count-code', 'Код без повторов', 'counting',
    'Сколько четырёхбуквенных кодов можно составить из пяти разных букв, если буквы в коде не повторяются?', '120'),
  numericTask('count-multiples', 'Кратные числа', 'counting',
    'Сколько положительных целых чисел меньше 100 делятся на 7?', '14'),

  numericTask('graph-shortest-two', 'Кратчайший путь II', 'graphs',
    'В неориентированном графе есть рёбра A—B (2), A—C (6), B—C (1), B—D (6), C—D (2), C—E (5), D—E (1), D—F (7), E—F (2). Какова длина кратчайшего пути из A в F?', '8'),
  numericTask('graph-unweighted', 'Число рёбер пути', 'graphs',
    'В неориентированном графе есть рёбра A—B, A—C, B—D, C—E, E—D, D—F и E—F. Сколько рёбер содержит кратчайший путь из A в F?', '3'),
  numericTask('graph-mst', 'Минимальное остовное дерево', 'graphs',
    'В графе четыре вершины A, B, C, D и рёбра A—B (1), A—C (4), B—C (2), B—D (5), C—D (3). Каков вес минимального остовного дерева?', '6'),
  numericTask('graph-degree', 'Степень вершины', 'graphs',
    'В графе есть рёбра A—B, A—C, B—C, C—D, D—E и D—F. Какова степень вершины C?', '3'),
  numericTask('graph-components', 'Компоненты связности', 'graphs',
    'Граф состоит из рёбер A—B, B—C, D—E, F—G, G—H и H—F. Сколько в нём компонент связности?', '3'),

  numericTask('game-take-one-two', 'Камни: ход 1 или 2', 'games',
    'В куче 17 камней. Игроки по очереди берут 1 или 2 камня; взявший последний выигрывает. Сколько камней должен взять первый игрок первым ходом, чтобы гарантировать победу?', '2'),
  numericTask('game-nim-unequal', 'Ним: две кучи', 'games',
    'Есть две кучи: 7 и 4 камня. За ход можно взять любое положительное число камней из одной кучи. Сколько камней нужно убрать из кучи в 7 камней первым ходом, чтобы гарантировать победу?', '3'),
  numericTask('game-nim-equal', 'Ним: равные кучи', 'games',
    'Есть две кучи по 12 камней. За ход можно взять любое положительное число камней из одной кучи. Запишите 1, если при правильной игре выигрывает первый игрок, и 2, если второй.', '2'),
  numericTask('game-take-one-three', 'Камни: ход 1, 2 или 3', 'games',
    'В куче 23 камня. Игроки по очереди берут от 1 до 3 камней; взявший последний выигрывает. Сколько камней нужно взять первым ходом, чтобы оставить сопернику проигрышную позицию?', '3'),
  numericTask('game-subtract-one-three', 'Камни: ход 1 или 3', 'games',
    'В куче 27 камней. За ход можно взять 1 или 3 камня; взявший последний выигрывает. Сколько камней нужно взять первым ходом, чтобы оставить сопернику число камней, кратное 4?', '3'),
]

export const BATTLE_TASKS: BattleTask[] = [
  ...BENCHMARK_TASKS.map((task) => {
    const categoryId = originalCategories[task.id]
    if (!categoryId) throw new Error(`No LLM Battle category for task ${task.id}`)
    return { ...task, categoryId }
  }),
  ...additionalTasks,
]
