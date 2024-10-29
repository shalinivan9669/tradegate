const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// URLs целевых сайтов
const site1 = {
  name: 'Site1',
  url: 'https://www.ls-tc.de/de/aktien-filter?page=63&o=displayName&d=ASC',
  tableSelector: 'table', // Возможно, нужно уточнить селектор
  columns: ['WKN', 'Name', 'Geld', 'Brief'],
  resultsJson: 'results/site1.json',
  resultsCsv: 'results/site1.csv'
};

const site2 = {
  name: 'Site2',
  url: 'https://www.tradegate.de/indizes.php?buchstabe=N',
  tableSelector: 'table', // Возможно, нужно уточнить селектор
  columns: ['Gattung', 'Bid', 'Ask'],
  resultsJson: 'results/site2.json',
  resultsCsv: 'results/site2.csv'
};

// Функция для парсинга сайта
async function fetchData(site) {
  try {
    const { data } = await axios.get(site.url);
    const $ = cheerio.load(data);

    const tableCount = $(site.tableSelector).length;
    console.log(`На сайте ${site.name} найдено таблиц: ${tableCount}`);

    if (tableCount === 0) {
      console.warn(`Не найдены таблицы на сайте ${site.name} с селектором '${site.tableSelector}'`);
      return [];
    }

    const results = [];

    // Проходим по каждой найденной таблице
    $(site.tableSelector).each((i, table) => {
      // Проходим по каждой строке таблицы
      $(table).find('tr').each((j, row) => {
        const columns = $(row).find('td');

        // Проверяем, что строка содержит нужное количество колонок
        if (columns.length >= site.columns.length) {
          const rowData = {};

          site.columns.forEach((col, index) => {
            rowData[col] = $(columns[index]).text().trim();
          });

          // Пропускаем строки с пустыми данными
          const hasAllData = site.columns.every(col => rowData[col]);
          if (hasAllData) {
            results.push(rowData);
          }
        }
      });
    });

    console.log(`Данные с ${site.name} успешно собраны. Количество записей: ${results.length}`);

    return results;
  } catch (error) {
    console.error(`Ошибка при загрузке данных с ${site.name}:`, error.message);
    return [];
  }
}

// Функция для сохранения данных в JSON
function saveAsJson(data, filepath) {
  fs.writeFile(filepath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error(`Ошибка при сохранении JSON файла (${filepath}):`, err);
    } else {
      console.log(`Данные успешно сохранены в ${filepath}`);
    }
  });
}

// Функция для сохранения данных в CSV
function saveAsCsv(data, filepath, columns) {
  const csvWriter = createCsvWriter({
    path: filepath,
    header: columns.map(col => ({ id: col, title: col })),
  });

  csvWriter.writeRecords(data)
    .then(() => {
      console.log(`Данные успешно сохранены в ${filepath}`);
    })
    .catch((err) => {
      console.error(`Ошибка при сохранении CSV файла (${filepath}):`, err);
    });
}

// Основная функция
async function main() {
  try {
    // Парсинг обоих сайтов параллельно
    const [dataSite1, dataSite2] = await Promise.all([
      fetchData(site1),
      fetchData(site2)
    ]);

    // Сохранение данных для Site1
    saveAsJson(dataSite1, site1.resultsJson);
    saveAsCsv(dataSite1, site1.resultsCsv, site1.columns);

    // Сохранение данных для Site2
    saveAsJson(dataSite2, site2.resultsJson);
    saveAsCsv(dataSite2, site2.resultsCsv, site2.columns);
  } catch (error) {
    console.error('Ошибка в основной функции:', error);
  }
}

main();
