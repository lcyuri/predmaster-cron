import cron from 'node-cron';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import util from 'util';

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
dotenv.config();

// Main
cron.schedule('*/1 * * * *', async () => {
  try {
    await alarmCronJob();
    //await historyCronJob();
    await previsionCronJob();
    await settingsCronJob();
  } catch (error) {
    console.log('Error running main task - ', error);
  }
});

// Cron jobs
const alarmCronJob = async () => {
  try {
    console.log('Running alarm cron job');

    let lastLine = await getLastLine('yellowAlarm');
    let newLines = await getNewLines(process.env.YELLOW_ALARM_PATH, lastLine);
    let url = process.env.HOST_NAME + process.env.ALARM_ENDPOINT + `?clientId=${process.env.CLIENT_ID}&color=yellow`;
    await postNewLines(url, newLines);
    await updateLastLine('yellowAlarm', newLines[0]);

    lastLine = await getLastLine('redAlarm');
    newLines = await getNewLines(process.env.RED_ALARM_PATH, lastLine);
    url = process.env.HOST_NAME + process.env.ALARM_ENDPOINT + `?clientId=${process.env.CLIENT_ID}&color=red`;
    await postNewLines(url, newLines);
    await updateLastLine('redAlarm', newLines[0]);

    console.log('Alarm cron job is complete');
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
    const url = process.env.HOST_NAME + process.env.PREVISION_ENDPOINT + `?clientId=${process.env.CLIENT_ID}`;
    await postNewLines(url, newLines);
    await updateLastLine('prevision', newLines[0]);

    console.log('Prevision cron job is complete');
  } catch(error) {
    console.log('Error running prevision cron job - ', error);
  }
}

const settingsCronJob = async () => {
  try {
    console.log('Running settings cron job');

    const lastLine = await getLastLine(process.env.SETTINGS_PATH);
    const newLines = await getNewLines(process.env.SETTINGS_PATH, lastLine);
    const url = process.env.HOST_NAME + process.env.SETTINGS_ENDPOINT + `?clientId=${process.env.CLIENT_ID}`;
    await postNewLines(url, newLines);
    await updateLastLine('settings', newLines[0]);

    console.log('Settings cron job is complete');
  } catch(error) {
    console.log('Error running settings cron job - ', error);
  }
}

// Utils and services
export const getLastLine = async (key: string): Promise<string> => {
  try {
    const data = await readFileAsync(process.env.LAST_LINE_PATH, 'utf8');
    const json = JSON.parse(data);
    return json[key];
  } catch (error) {
    console.log('Error getting last line - ', error);
  }
}

export const updateLastLine = async (key: string, value: string): Promise<void> => {
  try {
    const data = await readFileAsync(process.env.LAST_LINE_PATH, 'utf8');
    const json = JSON.parse(data);
    json[key] = value;
    await writeFileAsync(process.env.LAST_LINE_PATH, JSON.stringify(json), 'utf8');
  } catch (error) {
    console.log('Error updating last line - ', error);
  }
}

export const getNewLines = async (path: string, lastLine: string): Promise<string[]> => {
  try {
    const data = await readFileAsync(path, 'utf8');
    const lines = data.split('\n');
    return lines.filter(line => line !== lastLine);
  } catch (error) {
    console.log('Error getting new lines - ', error);
  }
}

const postNewLines = async (url: string, newLines: string[]): Promise<void> => {
  const requests = newLines.map(async (line) => {
    try {
      await axios.post(url, { line });
      return line;
    } catch (error) {
      console.error(`Error sending line to API: ${line}`, error);
      return line;
    }
  });

  await Promise.all(requests);
}