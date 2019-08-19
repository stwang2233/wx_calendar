import WxData from './wxData';
import CalendarConfig from './config';
import {
  Logger,
  GetDate,
  uniqueArrayByDate,
  delRepeatedEnableDay,
  convertEnableAreaToTimestamp,
  converEnableDaysToTimestamp
} from './utils';

const logger = new Logger();
const getDate = new GetDate();

function judegeParam(params) {
  const {
    start,
    end,
    startMonthDays,
    endMonthDays,
    startTimestamp,
    endTimestamp
  } = params;
  if (start[2] > startMonthDays || start[2] < 1) {
    logger.warn('enableArea() 开始日期错误，指定日期不在当前月份天数范围内');
    return false;
  } else if (start[1] > 12 || start[1] < 1) {
    logger.warn('enableArea() 开始日期错误，月份超出1-12月份');
    return false;
  } else if (end[2] > endMonthDays || end[2] < 1) {
    logger.warn('enableArea() 截止日期错误，指定日期不在当前月份天数范围内');
    return false;
  } else if (end[1] > 12 || end[1] < 1) {
    logger.warn('enableArea() 截止日期错误，月份超出1-12月份');
    return false;
  } else if (startTimestamp > endTimestamp) {
    logger.warn('enableArea()参数最小日期大于了最大日期');
    return false;
  } else {
    return true;
  }
}

class Day extends WxData {
  constructor(component) {
    super(component);
    this.Component = component;
  }
  /**
   * 指定可选日期范围
   * @param {array} area 日期访问数组
   */
  enableArea(area = []) {
    const enableDays = this.getData('calendar.enableDays') || [];
    let expectEnableDaysTimestamp = [];
    if (enableDays.length) {
      expectEnableDaysTimestamp = delRepeatedEnableDay(enableDays, area);
    }
    if (area.length === 2) {
      const {
        start,
        end,
        startTimestamp,
        endTimestamp
      } = convertEnableAreaToTimestamp(area);
      if (!start || !end) return;
      const startMonthDays = getDate.thisMonthDays(start[0], start[1]);
      const endMonthDays = getDate.thisMonthDays(end[0], end[1]);
      const isRight = judegeParam({
        start,
        end,
        startMonthDays,
        endMonthDays,
        startTimestamp,
        endTimestamp
      });
      if (isRight) {
        let { days = [], selectedDay = [] } = this.getData('calendar');
        const daysCopy = [...days];
        daysCopy.forEach(item => {
          const timestamp = getDate
            .newDate(item.year, item.month, item.day)
            .getTime();
          if (
            (+startTimestamp > +timestamp || +timestamp > +endTimestamp) &&
            !expectEnableDaysTimestamp.includes(+timestamp)
          ) {
            item.disable = true;
            if (item.choosed) {
              item.choosed = false;
              selectedDay = selectedDay.filter(
                d =>
                  `${item.year}-${item.month}-${item.day}` !==
                  `${d.year}-${d.month}-${d.day}`
              );
            }
          } else if (item.disable) {
            item.disable = false;
          }
        });
        this.setData({
          'calendar.days': daysCopy,
          'calendar.selectedDay': selectedDay,
          'calendar.enableArea': area,
          'calendar.enableAreaTimestamp': [startTimestamp, endTimestamp]
        });
      }
    } else {
      logger.warn(
        'enableArea()参数需为时间范围数组，形如：["2018-8-4" , "2018-8-24"]'
      );
    }
  }
  /**
   * 指定特定日期可选
   * @param {array} days 指定日期数组
   */
  enableDays(days = []) {
    const { enableArea = [], enableAreaTimestamp = [] } = this.getData(
      'calendar'
    );
    let expectEnableDaysTimestamp = [];
    if (enableArea.length) {
      expectEnableDaysTimestamp = delRepeatedEnableDay(days, enableArea);
    } else {
      expectEnableDaysTimestamp = converEnableDaysToTimestamp(days);
    }
    let { days: allDays = [], selectedDay = [] } = this.getData('calendar');
    const daysCopy = allDays.slice();
    daysCopy.forEach(item => {
      const timestamp = getDate
        .newDate(item.year, item.month, item.day)
        .getTime();
      let setDisable = false;
      if (enableAreaTimestamp.length) {
        if (
          (+enableAreaTimestamp[0] > +timestamp ||
            +timestamp > +enableAreaTimestamp[1]) &&
          !expectEnableDaysTimestamp.includes(+timestamp)
        ) {
          setDisable = true;
        }
      } else if (!expectEnableDaysTimestamp.includes(+timestamp)) {
        setDisable = true;
      }
      if (setDisable) {
        item.disable = true;
        if (item.choosed) {
          item.choosed = false;
          selectedDay = selectedDay.filter(
            d =>
              `${item.year}-${item.month}-${item.day}` !==
              `${d.year}-${d.month}-${d.day}`
          );
        }
      } else {
        item.disable = false;
      }
    });
    this.setData({
      'calendar.days': daysCopy,
      'calendar.selectedDay': selectedDay,
      'calendar.enableDays': days,
      'calendar.enableDaysTimestamp': expectEnableDaysTimestamp
    });
  }
  setSelectedDays(selected) {
    const config = CalendarConfig(this.Component).getCalendarConfig();
    if (!config.multi) {
      return logger.warn('单选模式下不能设置多日期选中，请配置 multi');
    }
    const { selectedDay, days, showLabelAlways } = this.getData('calendar');
    let newSelectedDay = [];
    if (!selected) {
      days.map(item => {
        item.choosed = true;
        item.showTodoLabel = false;
      });
      newSelectedDay = days;
    } else if (selected && selected.length) {
      if (selectedDay && selectedDay.length) {
        newSelectedDay = uniqueArrayByDate(selectedDay.concat(selected));
      } else {
        newSelectedDay = selected;
      }
      const { year: curYear, month: curMonth } = days[0];
      const currentSelectedDays = [];
      newSelectedDay.forEach(item => {
        if (+item.year === +curYear && +item.month === +curMonth) {
          currentSelectedDays.push(`${item.year}-${item.month}-${item.day}`);
        }
      });
      days.map(item => {
        if (
          currentSelectedDays.includes(`${item.year}-${item.month}-${item.day}`)
        ) {
          item.choosed = true;
          if (showLabelAlways && item.showTodoLabel) {
            item.showTodoLabel = true;
          } else {
            item.showTodoLabel = false;
          }
        }
      });
    }
    CalendarConfig(this.Component).setCalendarConfig('multi', true);
    this.setData({
      'calendar.days': days,
      'calendar.selectedDay': newSelectedDay
    });
  }
  /**
   * 禁用指定日期
   * @param {array} days  禁用
   */
  disableDays(data) {
    const { disableDays = [], days } = this.getData('calendar');
    if (Object.prototype.toString.call(data) !== '[object Array]') {
      return logger.warn('disableDays 参数为数组');
    }
    let _disableDays = [];
    if (data.length) {
      _disableDays = uniqueArrayByDate(data.concat(disableDays));
      const disableDaysCol = _disableDays.map(
        d => `${d.year}-${d.month}-${d.day}`
      );
      days.forEach(item => {
        const cur = `${item.year}-${item.month}-${item.day}`;
        if (disableDaysCol.includes(cur)) item.disable = true;
      });
    } else {
      days.forEach(item => {
        item.disable = false;
      });
    }
    this.setData({
      'calendar.days': days,
      'calendar.disableDays': _disableDays
    });
  }
}

export default component => new Day(component);
