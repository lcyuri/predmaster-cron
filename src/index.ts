import cron from 'node-cron';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import util from 'util';

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
dotenv.config();

// Main
cron.schedule('0 */2 * * *', async () => {
  try {
    await alarmCronJob();
    console.log('');
    // await historyCronJob();
    await previsionCronJob();
    console.log('');
    await settingsCronJob();
    console.log('');
  } catch (error) {
    console.error('cron - ', error);
  }
});

// Cron jobs
const alarmCronJob = async () => {
  try {
    console.log('Running alarm cron job');

    let lastLine = await getLastLine('yellowAlarm');
    let newLines = await getNewLines(process.env.YELLOW_ALARM_PATH, lastLine);
    let url = getUrl('yellowAlarm');
    await handleLines(url, newLines, 'yellowAlarm');

    lastLine = await getLastLine('redAlarm');
    newLines = await getNewLines(process.env.RED_ALARM_PATH, lastLine);
    url = getUrl('redAlarm');
    await handleLines(url, newLines, 'redAlarm');

    console.log('Alarm cron job is complete at: ', new Date());
  } catch(error) {
    console.log('Error running alarm cron job - ', error);
  }
}

// const historyCronJob = async () => {
//   try {
//     console.log('Running history cron job');

//     const lastLine = await getLastLine('history');
//     const newLines = await getNewLines(process.env.HISTORY_PATH, lastLine);
//     const url = process.env.HOST_NAME + process.env.HISTORY_ENDPOINT + `?clientId=${process.env.CLIENT_ID}`;
//     await postNewLines(url, newLines);
//     await updateLastLine('history', newLines[0]);

//     console.log('History cron job is complete');
//   } catch(error) {
//     console.log('Error running history cron job - ', error);
//   }
// }

const previsionCronJob = async () => {
  try {
    console.log('Running prevision cron job');

    const lastLine = await getLastLine('prevision');
    const newLines = await getNewLines(process.env.PREVISION_PATH, lastLine);
    const url = getUrl('prevision');
    await handleLines(url, newLines, 'prevision');

    console.log('Prevision cron job is complete at: ', new Date());
  } catch(error) {
    console.error('previsionCronJob - ', error);
    throw new Error('Error running prevision cron job');
  }
}

const settingsCronJob = async () => {
  try {
    console.log('Running settings cron job');

    const lastLine = await getLastLine('settings');
    const newLines = await getNewLines(process.env.SETTINGS_PATH, lastLine);
    const url = getUrl('settings');
    await handleLines(url, newLines, 'settings');

    console.log('Settings cron job is complete at: ', new Date());
  } catch(error) {
    console.error('settingsCronJob - ', error);
    throw new Error('Error running settings cron job');
  }
}

// Utils and services
export const getLastLine = async (key: string): Promise<string> => {
  try {
    const data = await readFileAsync(process.env.LAST_LINES_PATH, 'utf8');
    const json = JSON.parse(data);
    return json[key];
  } catch (error) {
    console.error(`getLastStoredLine - `, error);
    throw new Error('Error getting last line stored');
  }
}

export const getNewLines = async (path: string, lastLine: string): Promise<string[]> => {
  try {
    const data = await readFileAsync(path, 'utf8');
    let lines = data.split('\n');
    lines = removeEmptyLines(lines);
    const newLines = removeExistingLines(lines, lastLine);
    return newLines;
  } catch (error) {
    console.error(`getNewLines - `, error);
    throw new Error('Error getting new lines');
  }
}

export const removeExistingLines = (lines: string[], lastLine: string) => {
  const lastIndex = lines.indexOf(lastLine);
  if (lastIndex === -1) {
    return lines;
  } else {
    return lines.slice(lastIndex + 1);
  }
}

export const removeEmptyLines = (lines: string[]) => {
  return lines.filter(line => line.trim().length > 0);
}

const getUrl = (key: string): string => {
  switch (key) {
    case 'prevision':
      return process.env.HOST_NAME + process.env.PREVISION_ENDPOINT + `?clientId=${process.env.CLIENT_ID}`;
    case 'settings':
      return process.env.HOST_NAME + process.env.SETTINGS_ENDPOINT + `?clientId=${process.env.CLIENT_ID}`;
    case 'yellowAlarm':
      return process.env.HOST_NAME + process.env.ALARM_ENDPOINT + `?clientId=${process.env.CLIENT_ID}&color=yellow`;
    case 'redAlarm':
      return process.env.HOST_NAME + process.env.ALARM_ENDPOINT + `?clientId=${process.env.CLIENT_ID}&color=red`;
    default:
      return '';
  }
}

async function handleLines(url: string, newLines: string[], job: string): Promise<void> {
  for (const line of newLines) {
    try {
      const response = await postNewLine(url, line);
      if (response.data?.length > 0) {
        await updateLastLine(line, job);
      }
    } catch (error) {
      console.error('processLines - ', error);
    }
  }
}

const postNewLine = async (url: string, newLine: string): Promise<any> => {
  try {
    return await axios.post(url, { lines: newLine });
  } catch (error) {
    console.error(`postNewLines - `, error);
    throw new Error('Error posting new lines');
  }
}

export const updateLastLine = async (value: string, key: string): Promise<void> => {
  try {
    const data = await readFileAsync(process.env.LAST_LINES_PATH, 'utf8');
    const json = JSON.parse(data);
    json[key] = value || '';
    await writeFileAsync(process.env.LAST_LINES_PATH, JSON.stringify(json), 'utf8');
  } catch (error) {
    console.error(`updateLastLine - `, error);
    throw new Error('Error updating last line');
  }
}
