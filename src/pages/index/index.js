import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, RadioGroup, Radio, Dropdown } from '@douyinfe/semi-ui';

import * as taskApi from '@/apis/task';
import * as recordApi from '@/apis/record';
import audio from '@/assets/Yoann Garel, Aphrow - Love Departure.mp3';

import styles from './style.less';

/**
 * 表示特定日期格式 "YYYY-MM-DD" 的日期字符串
 * @typedef {string} DateFormat
 */

/**
 * 打卡记录
 * @typedef {object} Record
 * @property {string} _id
 * @property {string} name
 * @property {DateFormat} date
 * @property {number} value
 * @property {number} target
 * @property {string} username
 */

/**
 * 将秒数格式化为12:20这样的时间格式
 * @param {number} seconds
 * @returns {string}
 */
const formatSeconds = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  // 使用padStart确保分钟和秒数始终是两位数
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = remainingSeconds.toString().padStart(2, '0');

  return formattedMinutes + ':' + formattedSeconds;
};

/**
 * 倒计时
 * @param {number} endTime
 * @param {function} callback
 * @returns {string}
 */
const countDown = (endTime, callback) => {
  const countdownHelper = () => {
    const currentTime = new Date().getTime();
    const secondsRemaining = Math.max(0, Math.floor((endTime - currentTime) / 1000));

    const timer = setTimeout(countdownHelper, 300);
    callback(secondsRemaining, timer);
  };

  countdownHelper();
};

/**
 * 获取当天的年月日
 * @param {Date} date
 * @returns {DateFormat}
 */
function formatter(date) {
  const year = date.getFullYear();
  const month = (1 + date.getMonth()).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return year + '-' + month + '-' + day;
}

function App() {
  // 1 默认状态
  // 2 倒计时中
  // 3 倒计时结束
  const [status, setStatus] = useState('1');
  const [countDownSeconds, setCountDownSeconds] = useState(0);
  const [currentName, setCurrentName] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [names, setNames] = useState([]);
  const [times] = useState([5, 10, 15, 20, 25]);
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || '';
  const isDisabled = !currentName || !currentTime;
  const musicPlayer = document.getElementById('musicPlayer');

  const syncOriginData = (name, time) => {
    const task = tasks.find((task) => task.name === name);

    if (!task) {
      throw new Error('syncOriginData()调用失败，无法匹配到远程任务');
    }

    const target = task.target;
    const now = formatter(new Date());

    recordApi
      .get({
        name,
        username,
        date: now,
      })
      .then((res) => {
        /** @type {Record[]} */
        const records = res.data;
        /** @type {number} */
        const len = records.length;

        if (len === 0) {
          recordApi.add({
            // 任务名
            name,
            // 时间
            time,
            // 用户名
            username,
            // 当天时间
            date: now,
            value: time,
            // 目标时间
            target,
          });
          return;
        }

        if (len === 1) {
          const [record] = records;
          recordApi.update({
            query: {
              name,
              date: now,
              username,
            },
            payload: {
              value: record.value + time,
            },
          });
          return;
        }

        throw new Error('syncOriginData()调用失败，匹配到多条record');
      });
  };

  const start = ({ endTime, currentName, currentTime }) => {
    setStatus('2');
    countDown(endTime, (seconds, timer) => {
      setCountDownSeconds(seconds);
      if (seconds <= 0) {
        setStatus('3');
        clearTimeout(timer);
        syncOriginData(currentName, currentTime);
        remind();
      }
    });
  };

  const onStart = () => {
    if (!currentName) {
      alert('请选择任务');
      return;
    }

    if (!currentTime) {
      alert('请选择时间');
      return;
    }

    const durationMillisecond = currentTime * 60 * 1000;
    const endTime = new Date().getTime() + durationMillisecond;

    start({ endTime, currentName, currentTime });
  };

  const remind = () => {
    musicPlayer.play();

    if (window.electronAPI) {
      window.electronAPI.taskFinish({
        data: 'ok',
      });
    }
  };

  const onLogout = () => {
    localStorage.removeItem('username');
    navigate('/login', { replace: true });
  };

  const onFinished = () => {
    musicPlayer.pause();
    musicPlayer.currentTime = 0;
    setStatus('1');
  };

  useEffect(() => {
    taskApi.list({ username }).then((res) => {
      const tasks = res.data;
      setTasks(tasks);
      setNames(tasks.map((item) => item.name));
    });
  }, [username]);

  useEffect(() => {
    if (!username) {
      // 这个跳转要不留历史
      navigate(`/login?redirect_url=${window.location.href}`);
    }
  }, [username, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>番茄时钟</div>
        <Dropdown
          render={
            <Dropdown.Menu>
              <Dropdown.Item onClick={onLogout}>退出登录</Dropdown.Item>
            </Dropdown.Menu>
          }
        >
          <Button>{username}</Button>
        </Dropdown>
      </div>
      <div className={styles.row}>
        <Form.Label>任务:</Form.Label>
        <RadioGroup
          type="button"
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
        >
          {names.map((item) => (
            <Radio
              key={item}
              value={item}
            >
              {item}
            </Radio>
          ))}
        </RadioGroup>
      </div>
      <div className={styles.row}>
        <Form.Label>时间:</Form.Label>
        <RadioGroup
          type="button"
          value={currentTime}
          onChange={(e) => setCurrentTime(e.target.value)}
        >
          {times.map((item) => (
            <Radio
              key={item}
              value={item}
            >
              {item}分钟
            </Radio>
          ))}
        </RadioGroup>
      </div>
      <Button
        block
        theme="solid"
        type="primary"
        disabled={isDisabled}
        onClick={onStart}
      >
        启动
      </Button>
      {status === '2' && (
        <div className={`${styles.mask} ${styles.countDownValue}`}>{formatSeconds(countDownSeconds)}</div>
      )}
      {status === '3' && (
        <div className={styles.mask}>
          <div>
            <div className={styles.finished}>恭喜，任务完成！</div>
            <Button
              block
              theme="solid"
              type="primary"
              onClick={onFinished}
            >
              确定
            </Button>
          </div>
        </div>
      )}

      <audio
        style={{ display: 'none' }}
        id="musicPlayer"
        controls
      >
        <source
          src={audio}
          type="audio/mpeg"
        />
        Your browser does not support the audio tag.
      </audio>
    </div>
  );
}

export default App;
