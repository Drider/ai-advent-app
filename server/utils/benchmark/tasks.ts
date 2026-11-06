import type { BenchmarkTask } from './types'

export const BENCHMARK_TASKS: BenchmarkTask[] = [
  {
    id: 'logic',
    title: 'Логика',
    question: 'Пропал ключ. Его взял один из четырёх человек. Анна говорит: «Ключ взял Борис». Борис: «Ключ взял Глеб». Вера: «Ключ взяла не я». Глеб: «Борис ошибается». Известно, что ровно одно высказывание истинно. Кто взял ключ?',
    answerKey: 'Вера',
    answerShape: 'token',
    distractors: ['Анна', 'Борис', 'Глеб'],
  },
  {
    id: 'graph',
    title: 'Кратчайший путь',
    question: 'Дан неориентированный граф с рёбрами: A—B (4), A—C (2), B—C (1), B—D (5), C—D (8), C—E (10), D—E (2), D—F (6), E—F (3). Найдите кратчайший путь из A в F и его длину.',
    answerKey: 'A-C-B-D-E-F, 13',
    answerShape: 'path+number',
  },
  {
    id: 'counting',
    title: 'Подсчёт',
    question: 'Сколько существует пятизначных чисел с попарно различными цифрами, у которых сумма цифр равна 18 и которые делятся на 5?',
    answerKey: '402',
    answerShape: 'integer',
  },
  {
    id: 'modular',
    title: 'Модульная арифметика',
    question: 'Найдите последние три цифры числа 7^2026.',
    answerKey: '649',
    answerShape: 'integer',
  },
  {
    id: 'game',
    title: 'Теория игр',
    question: 'На столе лежит куча из 2027 камней. Два игрока ходят по очереди. За один ход можно взять 1, 3 или 4 камня. Тот, кто не может сделать ход (камней не осталось), проигрывает. Кто выигрывает при правильной игре — первый или второй игрок — и каким первым ходом?',
    answerKey: 'первый, 4',
    answerShape: 'winner+move',
  },
  {
    id: 'diophantine',
    title: 'Диофантово уравнение',
    question: 'В магазине продаются ручки по 23 ₽, тетради по 41 ₽ и ластики по 7 ₽. Покупатель купил ровно 17 предметов на общую сумму 523 ₽. Сколько ручек, тетрадей и ластиков он купил?',
    answerKey: '4, 10, 3',
    answerShape: 'tuple',
  },
]

export function getTask(id: string): BenchmarkTask | undefined {
  return BENCHMARK_TASKS.find(t => t.id === id)
}
