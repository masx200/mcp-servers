#!/usr/bin/env node
// Data一般用于表示从服务器上请求到的数据，Info一般表示解析并筛选过的要传输给大模型的数据。变量使用驼峰命名，常量使用全大写下划线命名。
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { z } from 'zod';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { StationDataKeys, TicketDataKeys, } from './types.js';
const API_BASE = 'https://kyfw.12306.cn';
const WEB_URL = 'https://www.12306.cn/index/';
const MISSING_STATIONS = [
    {
        station_id: '@cdd',
        station_name: '成  都东',
        station_code: 'WEI',
        station_pinyin: 'chengdudong',
        station_short: 'cdd',
        station_index: '',
        code: '1707',
        city: '成都',
        r1: '',
        r2: '',
    },
];
const STATIONS = await getStations(); //以Code为键
const CITY_STATIONS = (() => {
    const result = {};
    for (const station of Object.values(STATIONS)) {
        const city = station.city;
        if (!result[city]) {
            result[city] = [];
        }
        result[city].push({
            station_code: station.station_code,
            station_name: station.station_name,
        });
    }
    return result;
})(); //以城市名名为键，位于该城市的的所有Station列表的记录
const CITY_CODES = (() => {
    const result = {};
    for (const [city, stations] of Object.entries(CITY_STATIONS)) {
        for (const station of stations) {
            if (station.station_name == city) {
                result[city] = station;
                break;
            }
        }
    }
    return result;
})(); //以城市名名为键的Station记录
const NAME_STATIONS = (() => {
    const result = {};
    for (const station of Object.values(STATIONS)) {
        const station_name = station.station_name;
        result[station_name] = {
            station_code: station.station_code,
            station_name: station.station_name,
        };
    }
    return result;
})(); //以车站名为键的Station记录
const SEAT_SHORT_TYPES = {
    swz: '商务座',
    tz: '特等座',
    zy: '一等座',
    ze: '二等座',
    gr: '高软卧',
    srrb: '动卧',
    rw: '软卧',
    yw: '硬卧',
    rz: '软座',
    yz: '硬座',
    wz: '无座',
    qt: '其他',
    gg: '',
    yb: '',
};
const SEAT_TYPES = {
    '9': { name: '商务座', short: 'swz' },
    P: { name: '特等座', short: 'tz' },
    M: { name: '一等座', short: 'zy' },
    D: { name: '优选一等座', short: 'zy' },
    O: { name: '二等座', short: 'ze' },
    S: { name: '二等包座', short: 'ze' },
    '6': { name: '高级软卧', short: 'gr' },
    A: { name: '高级动卧', short: 'gr' },
    '4': { name: '软卧', short: 'rw' },
    I: { name: '一等卧', short: 'rw' },
    F: { name: '动卧', short: 'rw' },
    '3': { name: '硬卧', short: 'yw' },
    J: { name: '二等卧', short: 'yw' },
    '2': { name: '软座', short: 'rz' },
    '1': { name: '硬座', short: 'yz' },
    W: { name: '无座', short: 'wz' },
    WZ: { name: '无座', short: 'wz' },
    H: { name: '其他', short: 'qt' },
};
const DW_FLAGS = [
    '智能动车组',
    '复兴号',
    '静音车厢',
    '温馨动卧',
    '动感号',
    '支持选铺',
    '老年优惠',
];
const TRAIN_FILTERS = {
    //G(高铁/城际),D(动车),Z(直达特快),T(特快),K(快速),O(其他),F(复兴号),S(智能动车组)
    G: (ticketInfo) => {
        return ticketInfo.start_train_code.startsWith('G') ||
            ticketInfo.start_train_code.startsWith('C')
            ? true
            : false;
    },
    D: (ticketInfo) => {
        return ticketInfo.start_train_code.startsWith('D') ? true : false;
    },
    Z: (ticketInfo) => {
        return ticketInfo.start_train_code.startsWith('Z') ? true : false;
    },
    T: (ticketInfo) => {
        return ticketInfo.start_train_code.startsWith('T') ? true : false;
    },
    K: (ticketInfo) => {
        return ticketInfo.start_train_code.startsWith('K') ? true : false;
    },
    O: (ticketInfo) => {
        return TRAIN_FILTERS.G(ticketInfo) ||
            TRAIN_FILTERS.D(ticketInfo) ||
            TRAIN_FILTERS.Z(ticketInfo) ||
            TRAIN_FILTERS.T(ticketInfo) ||
            TRAIN_FILTERS.K(ticketInfo)
            ? false
            : true;
    },
    F: (ticketInfo) => {
        if ('dw_flag' in ticketInfo) {
            return ticketInfo.dw_flag.includes('复兴号') ? true : false;
        }
        return ticketInfo.ticketList[0].dw_flag.includes('复兴号') ? true : false;
    },
    S: (ticketInfo) => {
        if ('dw_flag' in ticketInfo) {
            return ticketInfo.dw_flag.includes('智能动车组') ? true : false;
        }
        return ticketInfo.ticketList[0].dw_flag.includes('智能动车组')
            ? true
            : false;
    },
};
function parseCookies(cookies) {
    const cookieRecord = {};
    cookies.forEach((cookie) => {
        // 提取键值对部分（去掉 Path、HttpOnly 等属性）
        const keyValuePart = cookie.split(';')[0];
        // 分割键和值
        const [key, value] = keyValuePart.split('=');
        // 存入对象
        if (key && value) {
            cookieRecord[key.trim()] = value.trim();
        }
    });
    return cookieRecord;
}
function formatCookies(cookies) {
    return Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
}
async function getCookie(url) {
    try {
        const response = await axios.get(url);
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
            return parseCookies(setCookieHeader);
        }
        return null;
    }
    catch (error) {
        console.error('Error making 12306 request:', error);
        return null;
    }
}
function parseRouteStationsData(rawData) {
    const result = [];
    for (const item of rawData) {
        result.push(item);
    }
    return result;
}
function parseRouteStationsInfo(routeStationsData) {
    const result = [];
    routeStationsData.forEach((routeStationData, index) => {
        if (index == 0) {
            result.push({
                arrive_time: routeStationData.start_time,
                station_name: routeStationData.station_name,
                stopover_time: routeStationData.stopover_time,
                station_no: parseInt(routeStationData.station_no),
            });
        }
        else {
            result.push({
                arrive_time: routeStationData.arrive_time,
                station_name: routeStationData.station_name,
                stopover_time: routeStationData.stopover_time,
                station_no: parseInt(routeStationData.station_no),
            });
        }
    });
    return result;
}
function parseTicketsData(rawData) {
    const result = [];
    for (const item of rawData) {
        const values = item.split('|');
        const entry = {};
        TicketDataKeys.forEach((key, index) => {
            entry[key] = values[index];
        });
        result.push(entry);
    }
    return result;
}
function parseTicketsInfo(ticketsData, map) {
    const result = [];
    for (const ticket of ticketsData) {
        const prices = extractPrices(ticket.yp_info_new, ticket.seat_discount_info, ticket);
        const dw_flag = extractDWFlags(ticket.dw_flag);
        result.push({
            train_no: ticket.train_no,
            start_train_code: ticket.station_train_code,
            start_time: ticket.start_time,
            arrive_time: ticket.arrive_time,
            lishi: ticket.lishi,
            from_station: map[ticket.from_station_telecode],
            to_station: map[ticket.to_station_telecode],
            from_station_telecode: ticket.from_station_telecode,
            to_station_telecode: ticket.to_station_telecode,
            prices: prices,
            dw_flag: dw_flag,
        });
    }
    return result;
}
function formatTicketsInfo(ticketsInfo) {
    if (ticketsInfo.length === 0) {
        return '没有查询到相关车次信息';
    }
    let result = '车次 | 出发站 -> 到达站 | 出发时间 -> 到达时间 | 历时\n';
    ticketsInfo.forEach((ticketInfo) => {
        let infoStr = '';
        infoStr += `${ticketInfo.start_train_code}(实际车次train_no: ${ticketInfo.train_no}) ${ticketInfo.from_station}(telecode: ${ticketInfo.from_station_telecode}) -> ${ticketInfo.to_station}(telecode: ${ticketInfo.to_station_telecode}) ${ticketInfo.start_time} -> ${ticketInfo.arrive_time} 历时：${ticketInfo.lishi}`;
        ticketInfo.prices.forEach((price) => {
            infoStr += `\n- ${price.seat_name}: ${price.num.match(/^\d+$/) ? price.num + '张' : price.num}剩余 ${price.price}元`;
        });
        result += `${infoStr}\n`;
    });
    return result;
}
function filterTicketsInfo(ticketsInfo, filters) {
    if (filters.length === 0) {
        return ticketsInfo;
    }
    const result = [];
    for (const ticketInfo of ticketsInfo) {
        for (const filter of filters) {
            if (TRAIN_FILTERS[filter](ticketInfo)) {
                result.push(ticketInfo);
                break;
            }
        }
    }
    return result;
}
function parseInterlinesTicketInfo(interlineTicketsData) {
    const result = [];
    for (const interlineTicketData of interlineTicketsData) {
        const prices = extractPrices(interlineTicketData.yp_info, interlineTicketData.seat_discount_info, interlineTicketData);
        result.push({
            train_no: interlineTicketData.train_no,
            start_train_code: interlineTicketData.station_train_code,
            start_time: interlineTicketData.start_time,
            arrive_time: interlineTicketData.arrive_time,
            lishi: interlineTicketData.lishi,
            from_station: interlineTicketData.from_station_name,
            to_station: interlineTicketData.to_station_name,
            from_station_telecode: interlineTicketData.from_station_telecode,
            to_station_telecode: interlineTicketData.to_station_telecode,
            prices: prices,
            dw_flag: extractDWFlags(interlineTicketData.dw_flag),
        });
    }
    return result;
}
function parseInterlinesInfo(interlineData) {
    const result = [];
    for (const ticket of interlineData) {
        const interlineTickets = parseInterlinesTicketInfo(ticket.fullList);
        result.push({
            all_lishi: ticket.all_lishi,
            start_time: ticket.start_time,
            start_date: ticket.train_date,
            middle_date: ticket.middle_date,
            arrive_date: ticket.arrive_date,
            arrive_time: ticket.arrive_time,
            from_station_code: ticket.from_station_code,
            from_station_name: ticket.from_station_name,
            middle_station_code: ticket.middle_station_code,
            middle_station_name: ticket.middle_station_name,
            end_station_code: ticket.end_station_code,
            end_station_name: ticket.end_station_name,
            start_train_code: interlineTickets[0].start_train_code,
            first_train_no: ticket.first_train_no,
            second_train_no: ticket.second_train_no,
            train_count: ticket.train_count,
            ticketList: interlineTickets,
            same_station: ticket.same_station == '0' ? true : false,
            same_train: ticket.same_train == 'Y' ? true : false,
            wait_time: ticket.wait_time,
        });
    }
    return result;
}
function formatInterlinesInfo(interlinesInfo) {
    let result = '出发时间 -> 到达时间 | 出发车站 -> 中转车站 -> 到达车站 | 换乘标志 |换乘等待时间| 总历时\n\n';
    interlinesInfo.forEach((interlineInfo) => {
        result += `${interlineInfo.start_date} ${interlineInfo.start_time} -> ${interlineInfo.arrive_date} ${interlineInfo.arrive_time} | `;
        result += `${interlineInfo.from_station_name} -> ${interlineInfo.middle_station_name} -> ${interlineInfo.end_station_name} | `;
        result += `${interlineInfo.same_train
            ? '同车换乘'
            : interlineInfo.same_station
                ? '同站换乘'
                : '换站换乘'} | ${interlineInfo.wait_time} | ${interlineInfo.all_lishi}\n\n`;
        result +=
            '\t' + formatTicketsInfo(interlineInfo.ticketList).replace(/\n/g, '\n\t');
        result += '\n';
    });
    return result;
}
function parseStationsData(rawData) {
    const result = {};
    const dataArray = rawData.split('|');
    const dataList = [];
    for (let i = 0; i < Math.floor(dataArray.length / 10); i++) {
        dataList.push(dataArray.slice(i * 10, i * 10 + 10));
    }
    for (const group of dataList) {
        let station = {};
        StationDataKeys.forEach((key, index) => {
            station[key] = group[index];
        });
        if (!station.station_code) {
            continue;
        }
        result[station.station_code] = station;
    }
    return result;
}
function extractPrices(yp_info, seat_discount_info, ticketData) {
    const PRICE_STR_LENGTH = 10;
    const DISCOUNT_STR_LENGTH = 5;
    const prices = [];
    const discounts = {};
    for (let i = 0; i < seat_discount_info.length / DISCOUNT_STR_LENGTH; i++) {
        const discount_str = seat_discount_info.slice(i * DISCOUNT_STR_LENGTH, (i + 1) * DISCOUNT_STR_LENGTH);
        discounts[discount_str[0]] = parseInt(discount_str.slice(1), 10);
    }
    for (let i = 0; i < yp_info.length / PRICE_STR_LENGTH; i++) {
        const price_str = yp_info.slice(i * PRICE_STR_LENGTH, (i + 1) * PRICE_STR_LENGTH);
        var seat_type_code;
        if (parseInt(price_str.slice(6, 10), 10) >= 3000) { // 根据12306的js逆向出来的，不懂。
            seat_type_code = 'W'; // 为无座
        }
        else if (!Object.keys(SEAT_TYPES).includes(price_str[0])) {
            seat_type_code = 'H'; // 其他坐席
        }
        else {
            seat_type_code = price_str[0];
        }
        const seat_type = SEAT_TYPES[seat_type_code];
        const price = parseInt(price_str.slice(1, 6), 10) / 10;
        const discount = seat_type_code in discounts ? discounts[seat_type_code] : null;
        prices.push({
            seat_name: seat_type.name,
            short: seat_type.short,
            seat_type_code,
            num: ticketData[`${seat_type.short}_num`],
            price,
            discount,
        });
    }
    return prices;
}
function extractDWFlags(dw_flag_str) {
    const dwFlagList = dw_flag_str.split('#');
    let result = [];
    if ('5' == dwFlagList[0]) {
        result.push(DW_FLAGS[0]);
    }
    if (dwFlagList.length > 1 && '1' == dwFlagList[1]) {
        result.push(DW_FLAGS[1]);
    }
    if (dwFlagList.length > 2) {
        if ('Q' == dwFlagList[2].substring(0, 1)) {
            result.push(DW_FLAGS[2]);
        }
        else if ('R' == dwFlagList[2].substring(0, 1)) {
            result.push(DW_FLAGS[3]);
        }
    }
    if (dwFlagList.length > 5 && 'D' == dwFlagList[5]) {
        result.push(DW_FLAGS[4]);
    }
    if (dwFlagList.length > 6 && 'z' != dwFlagList[6]) {
        result.push(DW_FLAGS[5]);
    }
    if (dwFlagList.length > 7 && 'z' != dwFlagList[7]) {
        result.push(DW_FLAGS[6]);
    }
    return result;
}
function checkDate(date) {
    const timeZone = 'Asia/Shanghai';
    const nowInShanghai = toZonedTime(new Date(), timeZone);
    nowInShanghai.setHours(0, 0, 0, 0);
    const inputInShanghai = toZonedTime(new Date(date), timeZone);
    inputInShanghai.setHours(0, 0, 0, 0);
    return inputInShanghai >= nowInShanghai;
}
async function make12306Request(url, scheme = new URLSearchParams(), headers = {}) {
    try {
        const response = await axios.get(url + '?' + scheme.toString(), {
            headers: headers,
        });
        return (await response.data);
    }
    catch (error) {
        console.error('Error making 12306 request:', error);
        return null;
    }
}
// Create server instance
const server = new McpServer({
    name: '12306-mcp',
    version: '0.3.0',
    capabilities: {
        resources: {},
        tools: {},
    },
    instructions: '该服务主要用于帮助用户查询火车票信息、特定列车的经停站信息以及相关的车站信息。请仔细理解用户的意图，并按以下指引选择合适的接口：\n\n' +
        '**原则：**\n' +
        '*   **优先理解意图**：判断用户的真实需求，是查票、查经停站还是查车站信息。\n' +
        '*   **参数准确性**：确保传递给每个的参数格式和类型都正确，特别是日期格式和地点编码。\n' +
        '*   **必要时追问**：如果用户信息不足以调用接口，请向用户追问缺失的信息。\n' +
        '*   **清晰呈现结果**：将接口返回的信息以用户易于理解的方式进行呈现。\n\n' +
        '请根据上述指引选择接口。',
});
server.resource('stations', 'data://all-stations', async (uri) => ({
    contents: [{ uri: uri.href, text: JSON.stringify(STATIONS) }],
}));
server.tool('get-current-date', '获取当前日期，以上海时区（Asia/Shanghai, UTC+8）为准，返回格式为 "yyyy-MM-dd"。主要用于解析用户提到的相对日期（如“明天”、“下周三”），为其他需要日期的接口提供准确的日期输入。', {}, async () => {
    try {
        const timeZone = 'Asia/Shanghai';
        const nowInShanghai = toZonedTime(new Date(), timeZone);
        const formattedDate = format(nowInShanghai, 'yyyy-MM-dd');
        return {
            content: [{ type: 'text', text: formattedDate }],
        };
    }
    catch (error) {
        console.error('Error getting current date:', error);
        return {
            content: [{ type: 'text', text: 'Error: Failed to get current date.' }],
        };
    }
});
server.tool('get-stations-code-in-city', '通过中文城市名查询该城市 **所有** 火车站的名称及其对应的 `station_code`，结果是一个包含多个车站信息的列表。当用户想了解一个城市有哪些火车站，或者不确定具体从哪个车站出发/到达时可以使用此接口。', {
    city: z.string().describe('中文城市名称，例如："北京", "上海"'),
}, async ({ city }) => {
    if (!(city in CITY_STATIONS)) {
        return {
            content: [{ type: 'text', text: 'Error: City not found. ' }],
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(CITY_STATIONS[city]) }],
    };
});
server.tool('get-station-code-of-citys', '通过中文城市名查询代表该城市的 `station_code`。此接口主要用于在用户提供**城市名**作为出发地或到达地时，为接口准备 `station_code` 参数。', {
    citys: z
        .string()
        .describe('要查询的城市，比如"北京"。若要查询多个城市，请用|分割，比如"北京|上海"。'),
}, async ({ citys }) => {
    let result = {};
    for (const city of citys.split('|')) {
        if (!(city in CITY_CODES)) {
            result[city] = { error: '未检索到城市。' };
        }
        else {
            result[city] = CITY_CODES[city];
        }
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
    };
});
server.tool('get-station-code-by-names', '通过具体的中文车站名查询其 `station_code` 和车站名。此接口主要用于在用户提供**具体车站名**作为出发地或到达地时，为接口准备 `station_code` 参数。', {
    stationNames: z
        .string()
        .describe('具体的中文车站名称，例如："北京南", "上海虹桥"。若要查询多个站点，请用|分割，比如"北京南|上海虹桥"。'),
}, async ({ stationNames }) => {
    let result = {};
    for (let stationName of stationNames.split('|')) {
        stationName = stationName.endsWith('站')
            ? stationName.substring(0, -1)
            : stationName;
        if (!(stationName in NAME_STATIONS)) {
            result[stationName] = { error: '未检索到城市。' };
        }
        else {
            result[stationName] = NAME_STATIONS[stationName];
        }
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
    };
});
server.tool('get-station-by-telecode', '通过车站的 `station_telecode` 查询车站的详细信息，包括名称、拼音、所属城市等。此接口主要用于在已知 `telecode` 的情况下获取更完整的车站数据，或用于特殊查询及调试目的。一般用户对话流程中较少直接触发。', {
    stationTelecode: z
        .string()
        .describe('车站的 `station_telecode` (3位字母编码)'),
}, async ({ stationTelecode }) => {
    if (!STATIONS[stationTelecode]) {
        return {
            content: [{ type: 'text', text: 'Error: Station not found. ' }],
        };
    }
    return {
        content: [
            { type: 'text', text: JSON.stringify(STATIONS[stationTelecode]) },
        ],
    };
});
server.tool('get-tickets', '查询12306余票信息。', {
    date: z
        .string()
        .length(10)
        .describe('查询日期，格式为 "yyyy-MM-dd"。如果用户提供的是相对日期（如“明天”），请务必先调用 `get-current-date` 接口获取当前日期，并计算出目标日期。'),
    fromStation: z
        .string()
        .describe('出发地的 `station_code` 。必须是通过 `get-station-code-by-name` 或 `get-station-code-of-city` 接口查询得到的编码，严禁直接使用中文地名。'),
    toStation: z
        .string()
        .describe('到达地的 `station_code` 。必须是通过 `get-station-code-by-name` 或 `get-station-code-of-city` 接口查询得到的编码，严禁直接使用中文地名。'),
    trainFilterFlags: z
        .string()
        .regex(/^[GDZTKOFS]*$/)
        .max(8)
        .optional()
        .default('')
        .describe('车次筛选条件，默认为空，即不筛选。例如用户说“高铁票”，则应使用 "G"。可选标志：[G(高铁/城际),D(动车),Z(直达特快),T(特快),K(快速),O(其他),F(复兴号),S(智能动车组)]'),
}, async ({ date, fromStation, toStation, trainFilterFlags }) => {
    // 检查日期是否早于当前日期
    if (!checkDate(date)) {
        return {
            content: [
                {
                    type: 'text',
                    text: 'Error: The date cannot be earlier than today.',
                },
            ],
        };
    }
    if (!Object.keys(STATIONS).includes(fromStation) ||
        !Object.keys(STATIONS).includes(toStation)) {
        return {
            content: [{ type: 'text', text: 'Error: Station not found. ' }],
        };
    }
    const queryParams = new URLSearchParams({
        'leftTicketDTO.train_date': date,
        'leftTicketDTO.from_station': fromStation,
        'leftTicketDTO.to_station': toStation,
        purpose_codes: 'ADULT',
    });
    const queryUrl = `${API_BASE}/otn/leftTicket/query`;
    const cookies = await getCookie(API_BASE);
    if (cookies == null) {
        return {
            content: [
                {
                    type: 'text',
                    text: 'Error: get cookie failed. Check your network.',
                },
            ],
        };
    }
    const queryResponse = await make12306Request(queryUrl, queryParams, { Cookie: formatCookies(cookies) });
    if (queryResponse === null || queryResponse === undefined) {
        return {
            content: [{ type: 'text', text: 'Error: get tickets data failed. ' }],
        };
    }
    const ticketsData = parseTicketsData(queryResponse.data.result);
    let ticketsInfo;
    try {
        ticketsInfo = parseTicketsInfo(ticketsData, queryResponse.data.map);
    }
    catch (error) {
        console.error('Error: parse tickets info failed. ', error);
        return {
            content: [{ type: 'text', text: 'Error: parse tickets info failed. ' }],
        };
    }
    const filteredTicketsInfo = filterTicketsInfo(ticketsInfo, trainFilterFlags);
    return {
        content: [{ type: 'text', text: formatTicketsInfo(filteredTicketsInfo) }],
    };
});
// https://kyfw.12306.cn/lcquery/queryG?
// train_date=2025-05-10&
// from_station_telecode=CDW&
// to_station_telecode=ZGE&
// middle_station=&
// result_index=0&
// can_query=Y&
// isShowWZ=N&
// purpose_codes=00&
// channel=E  ?channel是什么用的
server.tool('get-interline-tickets', '查询12306中转余票信息。尚且只支持查询前十条。', {
    date: z
        .string()
        .length(10)
        .describe('查询日期，格式为 "yyyy-MM-dd"。如果用户提供的是相对日期（如“明天”），请务必先调用 `get-current-date` 接口获取当前日期，并计算出目标日期。'),
    fromStation: z
        .string()
        .describe('出发地的 `station_code` 。必须是通过 `get-station-code-by-name` 或 `get-station-code-of-city` 接口查询得到的编码，严禁直接使用中文地名。'),
    toStation: z
        .string()
        .describe('出发地的 `station_code` 。必须是通过 `get-station-code-by-name` 或 `get-station-code-of-city` 接口查询得到的编码，严禁直接使用中文地名。'),
    middleStation: z
        .string()
        .optional()
        .default('')
        .describe('中转地的 `station_code` ，可选。必须是通过 `get-station-code-by-name` 或 `get-station-code-of-city` 接口查询得到的编码，严禁直接使用中文地名。'),
    showWZ: z
        .boolean()
        .optional()
        .default(false)
        .describe('是否显示无座车，默认不显示无座车。'),
    trainFilterFlags: z
        .string()
        .regex(/^[GDZTKOFS]*$/)
        .max(8)
        .optional()
        .default('')
        .describe('车次筛选条件，默认为空。从以下标志中选取多个条件组合[G(高铁/城际),D(动车),Z(直达特快),T(特快),K(快速),O(其他),F(复兴号),S(智能动车组)]'),
}, async ({ date, fromStation, toStation, middleStation, showWZ, trainFilterFlags, }) => {
    // 检查日期是否早于当前日期
    if (!checkDate(date)) {
        return {
            content: [
                {
                    type: 'text',
                    text: 'Error: The date cannot be earlier than today.',
                },
            ],
        };
    }
    if (!Object.keys(STATIONS).includes(fromStation) ||
        !Object.keys(STATIONS).includes(toStation)) {
        return {
            content: [{ type: 'text', text: 'Error: Station not found. ' }],
        };
    }
    const queryUrl = `${API_BASE}/lcquery/queryG`;
    const queryParams = new URLSearchParams({
        train_date: date,
        from_station_telecode: fromStation,
        to_station_telecode: toStation,
        middle_station: middleStation,
        result_index: '0',
        can_query: 'Y',
        isShowWZ: showWZ ? 'Y' : 'N',
        purpose_codes: '00', // 00: 成人票 0X: 学生票
        channel: 'E', // 没搞清楚什么用
    });
    const cookies = await getCookie(API_BASE);
    if (cookies == null) {
        return {
            content: [
                {
                    type: 'text',
                    text: 'Error: get cookie failed. Check your network.',
                },
            ],
        };
    }
    const queryResponse = await make12306Request(queryUrl, queryParams, { Cookie: formatCookies(cookies) });
    // 处理请求错误
    if (queryResponse === null || queryResponse === undefined) {
        return {
            content: [
                {
                    type: 'text',
                    text: 'Error: request interline tickets data failed. ',
                },
            ],
        };
    }
    // 请求成功，但查询有误
    if (typeof queryResponse.data == 'string') {
        return {
            content: [{ type: 'text', text: queryResponse.errorMsg }],
        };
    }
    // 请求和查询都没问题
    let interlineTicketsInfo;
    try {
        interlineTicketsInfo = parseInterlinesInfo(queryResponse.data.middleList);
    }
    catch (error) {
        return {
            content: [
                { type: 'text', text: `Error: parse tickets info failed. ${error}` },
            ],
        };
    }
    const filteredInterlineTicketsInfo = filterTicketsInfo(interlineTicketsInfo, trainFilterFlags);
    return {
        content: [
            {
                type: 'text',
                text: formatInterlinesInfo(filteredInterlineTicketsInfo),
            },
        ],
    };
});
server.tool('get-train-route-stations', '查询特定列车车次在指定区间内的途径车站、到站时间、出发时间及停留时间等详细经停信息。当用户询问某趟具体列车的经停站时使用此接口。', {
    trainNo: z
        .string()
        .describe('要查询的实际车次编号 `train_no`，例如 "240000G10336"，而非"G1033"。此编号通常可以从 `get-tickets` 的查询结果中获取，或者由用户直接提供。'),
    fromStationTelecode: z
        .string()
        .describe('该列车行程的**出发站**的 `station_telecode` (3位字母编码`)。通常来自 `get-tickets` 结果中的 `telecode` 字段，或者通过 `get-station-code-by-name` 得到。'),
    toStationTelecode: z
        .string()
        .describe('该列车行程的**到达站**的 `station_telecode` (3位字母编码)。通常来自 `get-tickets` 结果中的 `telecode` 字段，或者通过 `get-station-code-by-name` 得到。'),
    departDate: z
        .string()
        .length(10)
        .describe('列车从 `fromStationTelecode` 指定的车站出发的日期 (格式: yyyy-MM-dd)。如果用户提供的是相对日期，请务必先调用 `get-current-date` 解析。'),
}, async ({ trainNo: trainNo, fromStationTelecode, toStationTelecode, departDate, }) => {
    const queryParams = new URLSearchParams({
        train_no: trainNo,
        from_station_telecode: fromStationTelecode,
        to_station_telecode: toStationTelecode,
        depart_date: departDate,
    });
    const queryUrl = `${API_BASE}/otn/czxx/queryByTrainNo`;
    const cookies = await getCookie(API_BASE);
    if (cookies == null) {
        return {
            content: [{ type: 'text', text: 'Error: get cookie failed. ' }],
        };
    }
    const queryResponse = await make12306Request(queryUrl, queryParams, { Cookie: formatCookies(cookies) });
    if (queryResponse == null || queryResponse.data == undefined) {
        return {
            content: [
                { type: 'text', text: 'Error: get train route stations failed. ' },
            ],
        };
    }
    const routeStationsInfo = parseRouteStationsInfo(queryResponse.data.data);
    if (routeStationsInfo.length == 0) {
        return {
            content: [{ type: 'text', text: '未查询到相关车次信息。' }],
        };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(routeStationsInfo) }],
    };
});
async function getStations() {
    const html = await make12306Request(WEB_URL);
    if (html == null) {
        throw new Error('Error: get 12306 web page failed.');
    }
    const match = html.match('.(/script/core/common/station_name.+?.js)');
    if (match == null) {
        throw new Error('Error: get station name js file failed.');
    }
    const stationNameJSFilePath = match[0];
    const stationNameJS = await make12306Request(new URL(stationNameJSFilePath, WEB_URL));
    if (stationNameJS == null) {
        throw new Error('Error: get station name js file failed.');
    }
    const rawData = eval(stationNameJS.replace('var station_names =', ''));
    const stationsData = parseStationsData(rawData);
    // 加上缺失的车站信息
    for (const station of MISSING_STATIONS) {
        if (!stationsData[station.station_code]) {
            stationsData[station.station_code] = station;
        }
    }
    return stationsData;
}
async function init() { }
async function main() {
    const transport = new StdioServerTransport();
    await init();
    await server.connect(transport);
    console.error('12306 MCP Server running on stdio @Joooook');
}
main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
