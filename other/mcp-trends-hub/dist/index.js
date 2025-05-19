#!/usr/bin/env node
import * as __WEBPACK_EXTERNAL_MODULE_zod_validation_error_1fd569e4__ from "zod-validation-error";
import * as __WEBPACK_EXTERNAL_MODULE_node_os_74b4b876__ from "node:os";
import * as __WEBPACK_EXTERNAL_MODULE_node_path_c5b9b54f__ from "node:path";
import * as __WEBPACK_EXTERNAL_MODULE_node_fs_5ea92f0c__ from "node:fs";
import * as __WEBPACK_EXTERNAL_MODULE_dayjs__ from "dayjs";
import "dayjs/locale/zh-cn";
import * as __WEBPACK_EXTERNAL_MODULE_axios__ from "axios";
import "node:util";
import * as __WEBPACK_EXTERNAL_MODULE_fast_xml_parser_1c5d6bda__ from "fast-xml-parser";
import * as __WEBPACK_EXTERNAL_MODULE_node_crypto_9ba42079__ from "node:crypto";
import * as __WEBPACK_EXTERNAL_MODULE_node_url_e96de089__ from "node:url";
import * as __WEBPACK_EXTERNAL_MODULE_zod__ from "zod";
import * as __WEBPACK_EXTERNAL_MODULE__modelcontextprotocol_sdk_server_mcp_js_2c42c5d0__ from "@modelcontextprotocol/sdk/server/mcp.js";
import * as __WEBPACK_EXTERNAL_MODULE__modelcontextprotocol_sdk_server_stdio_js_4f861174__ from "@modelcontextprotocol/sdk/server/stdio.js";
import * as __WEBPACK_EXTERNAL_MODULE__modelcontextprotocol_sdk_types_js_fc45a208__ from "@modelcontextprotocol/sdk/types.js";
import * as __WEBPACK_EXTERNAL_MODULE_zod_to_json_schema_a1d75503__ from "zod-to-json-schema";
var __webpack_modules__ = {
    "./src/tools sync recursive \\.(js%7Cts)$": function(module, __unused_webpack_exports, __webpack_require__) {
        var map = {
            "./$custom-rss.ts": "./src/tools/$custom-rss.ts",
            "./36kr.ts": "./src/tools/36kr.ts",
            "./9to5mac.ts": "./src/tools/9to5mac.ts",
            "./bbc.ts": "./src/tools/bbc.ts",
            "./bilibili.ts": "./src/tools/bilibili.ts",
            "./douban.ts": "./src/tools/douban.ts",
            "./douyin.ts": "./src/tools/douyin.ts",
            "./gcores.ts": "./src/tools/gcores.ts",
            "./ifanr.ts": "./src/tools/ifanr.ts",
            "./infoq.ts": "./src/tools/infoq.ts",
            "./juejin.ts": "./src/tools/juejin.ts",
            "./netease-news.ts": "./src/tools/netease-news.ts",
            "./nytimes.ts": "./src/tools/nytimes.ts",
            "./smzdm.ts": "./src/tools/smzdm.ts",
            "./sspai.ts": "./src/tools/sspai.ts",
            "./tencent-news.ts": "./src/tools/tencent-news.ts",
            "./thepaper.ts": "./src/tools/thepaper.ts",
            "./theverge.ts": "./src/tools/theverge.ts",
            "./toutiao.ts": "./src/tools/toutiao.ts",
            "./weibo.ts": "./src/tools/weibo.ts",
            "./weread.ts": "./src/tools/weread.ts",
            "./zhihu.ts": "./src/tools/zhihu.ts"
        };
        function webpackContext(req) {
            var id = webpackContextResolve(req);
            return __webpack_require__(id);
        }
        function webpackContextResolve(req) {
            if (!__webpack_require__.o(map, req)) {
                var e = new Error("Cannot find module '" + req + "'");
                e.code = 'MODULE_NOT_FOUND';
                throw e;
            }
            return map[req];
        }
        webpackContext.keys = function() {
            return Object.keys(map);
        };
        webpackContext.resolve = webpackContextResolve;
        module.exports = webpackContext;
        webpackContext.id = "./src/tools sync recursive \\.(js%7Cts)$";
    },
    "./src/tools/$custom-rss.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>$custom_rss
        });
        var utils = __webpack_require__("./src/utils/index.ts");
        const $custom_rss = (0, utils.aM)(async ()=>{
            var _resp_rss;
            const rssUrl = process.env.TRENDS_HUB_CUSTOM_RSS_URL;
            if (!rssUrl) throw new Error('TRENDS_HUB_CUSTOM_RSS_URL not found');
            const resp = await (0, utils.P_)(rssUrl);
            if (!(null == resp ? void 0 : null === (_resp_rss = resp.rss) || void 0 === _resp_rss ? void 0 : _resp_rss.channel)) throw new Error('Invalid RSS feed');
            let description = resp.rss.channel.title;
            if (resp.rss.channel.description) description += ` - ${resp.rss.channel.description}`;
            return {
                name: 'custom-rss',
                description,
                func: ()=>(0, utils.uf)(rssUrl)
            };
        });
    },
    "./src/tools/36kr.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>_36kr
        });
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        const get36krRequestSchema = external_zod_.z.object({
            type: external_zod_.z.union([
                external_zod_.z.literal('hot').describe('人气榜'),
                external_zod_.z.literal('video').describe('视频榜'),
                external_zod_.z.literal('comment').describe('热议榜'),
                external_zod_.z.literal('collect').describe('收藏榜')
            ]).optional().default('hot').describe('分类')
        });
        const LIST_TYPE_MAP = {
            hot: 'hotRankList',
            video: 'videoList',
            comment: 'remarkList',
            collect: 'collectList'
        };
        const _36kr = (0, utils.aM)({
            name: 'get-36kr-trending',
            description: '获取 36 氪热榜，提供创业、商业、科技领域的热门资讯，包含投融资动态、新兴产业分析和商业模式创新信息',
            zodSchema: get36krRequestSchema,
            func: async (args)=>{
                const { type } = get36krRequestSchema.parse(args);
                const resp = await utils.dJ.post(`https://gateway.36kr.com/api/mis/nav/home/nav/rank/${type}`, {
                    partner_id: 'wap',
                    param: {
                        siteId: 1,
                        platformId: 2
                    },
                    timestamp: Date.now()
                }, {
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8'
                    }
                });
                return resp.data.data[LIST_TYPE_MAP[type]].map((item)=>{
                    const data = item.templateMaterial;
                    return {
                        title: data.widgetTitle,
                        cover: data.widgetImage,
                        author: data.authorName,
                        publish_time: (0, utils.Bv)(data.publishTime).toISOString(),
                        read_count: data.statRead,
                        collect_count: data.statCollect,
                        comment_count: data.statComment,
                        praise_count: data.statPraise,
                        link: `https://www.36kr.com/p/${data.itemId}`
                    };
                });
            }
        });
    },
    "./src/tools/9to5mac.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>_9to5mac
        });
        var utils = __webpack_require__("./src/utils/index.ts");
        const _9to5mac = (0, utils.aM)({
            name: 'get-9to5mac-news',
            description: '获取 9to5Mac 苹果相关新闻，包含苹果产品发布、iOS 更新、Mac 硬件、应用推荐及苹果公司动态的英文资讯',
            func: ()=>(0, utils.uf)('https://9to5mac.com/feed/')
        });
    },
    "./src/tools/bbc.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>bbc
        });
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        const bbcRequestSchema = external_zod_.z.object({
            category: external_zod_.z.union([
                external_zod_.z.literal('').describe('热门新闻'),
                external_zod_.z.literal('world').describe('国际'),
                external_zod_.z.literal('uk').describe('英国'),
                external_zod_.z.literal('business').describe('商业'),
                external_zod_.z.literal('politics').describe('政治'),
                external_zod_.z.literal('health').describe('健康'),
                external_zod_.z.literal('education').describe('教育'),
                external_zod_.z.literal('science_and_environment').describe('科学与环境'),
                external_zod_.z.literal('technology').describe('科技'),
                external_zod_.z.literal('entertainment_and_arts').describe('娱乐与艺术')
            ]).optional().default(''),
            edition: external_zod_.z.union([
                external_zod_.z.literal(''),
                external_zod_.z.literal('uk').describe('UK'),
                external_zod_.z.literal('us').describe('US & Canada'),
                external_zod_.z.literal('int').describe('Rest of the world')
            ]).optional().default('').describe('版本，仅对 `category` 为空有效')
        }).transform((values)=>{
            let url = 'https://feeds.bbci.co.uk/news/';
            if (values.category) url += `${values.category}/`;
            url += 'rss.xml';
            if (values.edition) url += `?edition=${values.edition}`;
            return {
                ...values,
                url
            };
        });
        const bbc = (0, utils.aM)({
            name: 'get-bbc-news',
            description: '获取 BBC 新闻，提供全球新闻、英国新闻、商业、政治、健康、教育、科技、娱乐等资讯',
            zodSchema: bbcRequestSchema,
            func: async (args)=>{
                const { url } = bbcRequestSchema.parse(args);
                return (0, utils.uf)(url);
            }
        });
    },
    "./src/tools/bilibili.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>bilibili
        });
        var external_node_crypto_ = __webpack_require__("node:crypto");
        var external_node_url_ = __webpack_require__("node:url");
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        const bilibiliRequestSchema = external_zod_.z.object({
            type: external_zod_.z.union([
                external_zod_.z.literal(0).describe('全站'),
                external_zod_.z.literal(1).describe('动画'),
                external_zod_.z.literal(3).describe('音乐'),
                external_zod_.z.literal(4).describe('游戏'),
                external_zod_.z.literal(5).describe('娱乐'),
                external_zod_.z.literal(188).describe('科技'),
                external_zod_.z.literal(119).describe('鬼畜'),
                external_zod_.z.literal(129).describe('舞蹈'),
                external_zod_.z.literal(155).describe('时尚'),
                external_zod_.z.literal(160).describe('生活'),
                external_zod_.z.literal(168).describe('国创相关'),
                external_zod_.z.literal(181).describe('影视')
            ]).optional().default(0).describe('排行榜分区')
        });
        const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
        const encodeWbi = (params, imgKey, subKey)=>{
            const chrFilter = /[!'()*]/g;
            const search = new external_node_url_.URLSearchParams();
            const paramsWithTs = {
                ...params,
                wts: (0, utils.Bv)().unix().toString()
            };
            const sortedKeys = Object.keys(paramsWithTs).sort();
            for (const key of sortedKeys){
                const value = paramsWithTs[key].toString().replace(chrFilter, '');
                search.set(key, value);
            }
            const mixinKey = [
                46,
                47,
                18,
                2,
                53,
                8,
                23,
                32,
                15,
                50,
                10,
                31,
                58,
                3,
                45,
                35,
                27,
                43,
                5,
                49,
                33,
                9,
                42,
                19,
                29,
                28,
                14,
                39,
                12,
                38,
                41,
                13,
                37,
                48,
                7,
                16,
                24,
                55,
                40,
                61,
                26,
                17,
                0,
                1,
                60,
                51,
                30,
                4,
                22,
                25,
                54,
                21,
                56,
                59,
                6,
                63,
                57,
                62,
                11,
                36,
                20,
                34,
                44,
                52
            ].map((n)=>`${imgKey}${subKey}`[n]).join('').slice(0, 32);
            const wbiSign = (0, external_node_crypto_.createHash)('md5').update(search.toString() + mixinKey).digest('hex');
            search.set('w_rid', wbiSign);
            return search.toString();
        };
        const getWbiKeys = async ()=>{
            const resp = await utils.dJ.get('https://api.bilibili.com/x/web-interface/nav', {
                headers: {
                    Cookie: 'SESSDATA=xxxxxx',
                    'User-Agent': UA,
                    Referer: 'https://www.bilibili.com/'
                }
            });
            const { img_url: imgUrl = '', sub_url: subUrl = '' } = resp.data.data.wbi_img;
            const getFileNameFromUrl = (url)=>url.slice(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
            return {
                imgKey: getFileNameFromUrl(imgUrl),
                subKey: getFileNameFromUrl(subUrl)
            };
        };
        const getBiliWbi = async ()=>{
            const CACHE_KEY = 'bilibili-wbi';
            const cachedData = utils.Dz.getItem(CACHE_KEY);
            if (cachedData) return cachedData;
            const { imgKey, subKey } = await getWbiKeys();
            const params = {
                foo: '114',
                bar: '514',
                baz: '1919810'
            };
            const query = encodeWbi(params, imgKey, subKey);
            utils.Dz.setItem(CACHE_KEY, query);
            return query;
        };
        const mainGetBilibiliRank = async (type)=>{
            const wbiData = await getBiliWbi();
            const resp = await utils.dJ.get(`https://api.bilibili.com/x/web-interface/ranking/v2?rid=${type}&type=all&${wbiData}`, {
                headers: {
                    Referer: 'https://www.bilibili.com/ranking/all',
                    'User-Agent': UA,
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                }
            });
            if (0 !== resp.data.code) throw new Error(resp.data.message);
            return resp.data.data.list.map((item)=>{
                var _item_owner, _item_stat;
                return {
                    title: item.title,
                    description: item.desc || '该视频暂无简介',
                    cover: item.pic,
                    author: null === (_item_owner = item.owner) || void 0 === _item_owner ? void 0 : _item_owner.name,
                    publishTime: utils.Bv.unix(item.pubdate).toISOString(),
                    view: (null === (_item_stat = item.stat) || void 0 === _item_stat ? void 0 : _item_stat.view) || 0,
                    link: item.short_link_v2 || `https://www.bilibili.com/video/${item.bvid}`
                };
            });
        };
        const backupGetBilibiliRank = async (type)=>{
            const resp = await utils.dJ.get(`https://api.bilibili.com/x/web-interface/ranking?jsonp=jsonp?rid=${type}&type=all&callback=__jp0`, {
                headers: {
                    Referer: 'https://www.bilibili.com/ranking/all',
                    'User-Agent': UA
                }
            });
            if (0 !== resp.data.code) throw new Error(resp.data.message);
            return resp.data.data.list.map((item)=>({
                    title: item.title,
                    description: item.desc || '该视频暂无简介',
                    cover: item.pic,
                    author: item.author,
                    view: item.video_review,
                    link: `https://www.bilibili.com/video/${item.bvid}`
                }));
        };
        const getBilibiliRank = async (type)=>{
            try {
                return await mainGetBilibiliRank(type);
            } catch (error) {
                utils.kg.error(error);
                return await backupGetBilibiliRank(type);
            }
        };
        const bilibili = (0, utils.aM)({
            name: 'get-bilibili-rank',
            description: '获取哔哩哔哩视频排行榜，包含全站、动画、音乐、游戏等多个分区的热门视频，反映当下年轻人的内容消费趋势',
            zodSchema: bilibiliRequestSchema,
            func: async (args)=>{
                const { type } = bilibiliRequestSchema.parse(args);
                return getBilibiliRank(type);
            }
        });
    },
    "./src/tools/douban.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>douban
        });
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        const doubanRankSchema = external_zod_.z.object({
            type: external_zod_.z.union([
                external_zod_.z.literal('subject').describe('图书、电影、电视剧、综艺等'),
                external_zod_.z.literal('movie').describe('电影'),
                external_zod_.z.literal('tv').describe('电视剧')
            ]).optional().default('subject'),
            start: external_zod_.z.number().int().optional().default(0),
            count: external_zod_.z.number().int().optional().default(10)
        });
        const URL_MAP = {
            subject: 'https://m.douban.com/rexxar/api/v2/subject_collection/subject_real_time_hotest/items',
            movie: 'https://m.douban.com/rexxar/api/v2/subject_collection/movie_real_time_hotest/items',
            tv: 'https://m.douban.com/rexxar/api/v2/subject_collection/tv_real_time_hotest/items'
        };
        const douban = (0, utils.aM)({
            name: 'get-douban-rank',
            description: '获取豆瓣实时热门榜单，提供当前热门的图书、电影、电视剧、综艺等作品信息，包含评分和热度数据',
            zodSchema: doubanRankSchema,
            func: async (args)=>{
                const { type, start, count } = doubanRankSchema.parse(args);
                const resp = await utils.dJ.get(URL_MAP[type], {
                    params: {
                        type,
                        start,
                        count,
                        for_mobile: 1
                    },
                    headers: {
                        Referer: 'https://m.douban.com/subject_collection/movie_real_time_hotest'
                    }
                });
                if (!Array.isArray(resp.data.subject_collection_items)) throw new Error('获取豆瓣实时热门榜失败');
                return resp.data.subject_collection_items.map((item)=>({
                        type_name: item.type_name,
                        title: item.title,
                        info: item.info,
                        cover: item.cover.url,
                        year: item.year,
                        release_date: item.release_date,
                        link: item.url,
                        popularity: item.score,
                        rating_count: item.rating.count,
                        rating_value: item.rating.count > 0 ? item.rating.value : void 0,
                        hashtags: item.related_search_terms.map((term)=>`#${term.name}`).join(' ')
                    }));
            }
        });
    },
    "./src/tools/douyin.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>douyin
        });
        var utils = __webpack_require__("./src/utils/index.ts");
        const getCsrfToken = async ()=>{
            try {
                var _reps_headers_setcookie;
                const reps = await utils.dJ.get('https://www.douyin.com/passport/general/login_guiding_strategy/', {
                    params: {
                        aid: 6383
                    }
                });
                const pattern = /passport_csrf_token=([^;]*); Path/;
                const matchResult = null === (_reps_headers_setcookie = reps.headers['set-cookie']) || void 0 === _reps_headers_setcookie ? void 0 : _reps_headers_setcookie[0].match(pattern);
                const csrfToken = null == matchResult ? void 0 : matchResult[1];
                return csrfToken;
            } catch (error) {
                return;
            }
        };
        const douyin = (0, utils.aM)({
            name: 'get-douyin-trending',
            description: '获取抖音热搜榜单，展示当下最热门的社会话题、娱乐事件、网络热点和流行趋势',
            func: async ()=>{
                var _resp_data;
                const csrfToken = await getCsrfToken();
                const resp = await utils.dJ.get('https://www.douyin.com/aweme/v1/web/hot/search/list/', {
                    params: {
                        device_platform: 'webapp',
                        aid: 6383,
                        channel: 'channel_pc_web',
                        detail_list: 1
                    },
                    headers: {
                        Cookie: `passport_csrf_token=${csrfToken}`
                    }
                });
                if ((null === (_resp_data = resp.data) || void 0 === _resp_data ? void 0 : _resp_data.status_code) !== 0 || !Array.isArray(resp.data.data.word_list)) throw new Error('获取抖音热榜失败');
                return resp.data.data.word_list.map((item)=>{
                    var _item_word_cover_url_list, _item_word_cover;
                    return {
                        title: item.word,
                        eventTime: utils.Bv.unix(item.event_time).toISOString(),
                        cover: null === (_item_word_cover = item.word_cover) || void 0 === _item_word_cover ? void 0 : null === (_item_word_cover_url_list = _item_word_cover.url_list) || void 0 === _item_word_cover_url_list ? void 0 : _item_word_cover_url_list[0],
                        popularity: item.hot_value,
                        link: `https://www.douyin.com/hot/${item.sentence_id}`
                    };
                });
            }
        });
    },
    "./src/tools/gcores.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>gcores
        });
        var utils = __webpack_require__("./src/utils/index.ts");
        const gcores = (0, utils.aM)({
            name: 'get-gcores-new',
            description: '获取机核网游戏相关资讯，包含电子游戏评测、玩家文化、游戏开发和游戏周边产品的深度内容',
            func: ()=>(0, utils.uf)('https://www.gcores.com/rss')
        });
    },
    "./src/tools/ifanr.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>ifanr
        });
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        const ifanrRequestSchema = external_zod_.z.object({
            limit: external_zod_.z.number().int().optional().default(20),
            offset: external_zod_.z.number().int().optional().default(0)
        });
        const ifanr = (0, utils.aM)({
            name: 'get-ifanr-news',
            description: '获取爱范儿科技快讯，包含最新的科技产品、数码设备、互联网动态等前沿科技资讯',
            zodSchema: ifanrRequestSchema,
            func: async (args)=>{
                const { limit, offset } = ifanrRequestSchema.parse(args);
                const resp = await utils.dJ.get('https://sso.ifanr.com/api/v5/wp/buzz', {
                    params: {
                        limit,
                        offset
                    }
                });
                if (!Array.isArray(resp.data.objects)) throw new Error('获取爱范儿快讯失败');
                return resp.data.objects.map((item)=>({
                        title: item.post_title,
                        description: item.post_content,
                        link: item.buzz_original_url || `https://www.ifanr.com/${item.post_id}`
                    }));
            }
        });
    },
    "./src/tools/infoq.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>infoq
        });
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        const infoqRequestSchema = external_zod_.z.object({
            region: external_zod_.z["enum"]([
                'cn',
                'global'
            ]).optional().default('cn')
        }).transform((data)=>{
            const url = {
                cn: 'https://www.infoq.cn/feed',
                global: 'https://feed.infoq.com/'
            }[data.region];
            return {
                ...data,
                url
            };
        });
        const infoq = (0, utils.aM)({
            name: 'get-infoq-news',
            description: '获取 InfoQ 技术资讯，包含软件开发、架构设计、云计算、AI等企业级技术内容和前沿开发者动态',
            zodSchema: infoqRequestSchema,
            func: async (args)=>{
                const { url, region } = infoqRequestSchema.parse(args);
                const resp = await (0, utils.uf)(url);
                if ('cn' === region) return resp.map((item)=>(0, utils.CE)(item, [
                        "description"
                    ]));
                return resp;
            }
        });
    },
    "./src/tools/juejin.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>juejin
        });
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        };
        const juejin = (0, utils.aM)(async ()=>{
            const categoryResp = await utils.dJ.get('https://api.juejin.cn/tag_api/v1/query_category_briefs', {
                headers
            });
            if (0 !== categoryResp.data.err_no) throw new Error('获取掘金分类失败');
            const juejinRequestSchema = external_zod_.z.object({
                category_id: external_zod_.z.union(categoryResp.data.data.map((item)=>external_zod_.z.literal(item.category_id).describe(item.category_name))).optional().default(categoryResp.data.data[0].category_id)
            });
            return {
                name: 'get-juejin-article-rank',
                description: '获取掘金文章榜，包含前端开发、后端技术、人工智能、移动开发及技术架构等领域的高质量中文技术文章和教程',
                zodSchema: juejinRequestSchema,
                func: async (args)=>{
                    const { category_id } = juejinRequestSchema.parse(args);
                    const resp = await utils.dJ.get('https://api.juejin.cn/content_api/v1/content/article_rank', {
                        params: {
                            category_id,
                            type: 'hot'
                        },
                        headers
                    });
                    if (0 !== resp.data.err_no) throw new Error(resp.data.err_msg || '获取掘金文章榜失败');
                    return resp.data.data.map((item)=>({
                            title: item.content.title,
                            brief: item.content.brief || void 0,
                            author: item.author.name,
                            popularity: item.content_counter.hot_rank,
                            view_count: item.content_counter.view,
                            like_count: item.content_counter.like,
                            collect_count: item.content_counter.collect,
                            comment_count: item.content_counter.comment_count,
                            interact_count: item.content_counter.interact_count,
                            link: `https://juejin.cn/post/${item.content.content_id}`
                        }));
                }
            };
        });
    },
    "./src/tools/netease-news.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>netease_news
        });
        var utils = __webpack_require__("./src/utils/index.ts");
        const netease_news = (0, utils.aM)({
            name: 'get-netease-news-trending',
            description: '获取网易新闻热点榜，包含时政要闻、社会事件、财经资讯、科技动态及娱乐体育的全方位中文新闻资讯',
            func: async ()=>{
                const resp = await utils.dJ.get('https://m.163.com/fe/api/hot/news/flow');
                if (200 !== resp.data.code || !Array.isArray(resp.data.data.list)) throw new Error('获取网易新闻热点榜失败');
                return resp.data.data.list.map((item)=>({
                        title: item.title,
                        cover: item.imgsrc,
                        source: item.source,
                        publish_time: item.ptime,
                        link: item.url
                    }));
            }
        });
    },
    "./src/tools/nytimes.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>nytimes
        });
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        const nytimesRequestSchema = external_zod_.z.object({
            region: external_zod_.z.union([
                external_zod_.z.literal('cn').describe('中文'),
                external_zod_.z.literal('global').describe('全球')
            ]).optional().default('cn'),
            section: external_zod_.z.string().optional().default('HomePage').describe('分类，当 `region` 为 `cn` 时无效。可选值: Africa, Americas, ArtandDesign, Arts, AsiaPacific, Automobiles, Baseball, Books/Review, Business, Climate, CollegeBasketball, CollegeFootball, Dance, Dealbook, DiningandWine, Economy, Education, EnergyEnvironment, Europe, FashionandStyle, Golf, Health, Hockey, HomePage, Jobs, Lens, MediaandAdvertising, MiddleEast, MostEmailed, MostShared, MostViewed, Movies, Music, NYRegion, Obituaries, PersonalTech, Politics, ProBasketball, ProFootball, RealEstate, Science, SmallBusiness, Soccer, Space, Sports, SundayBookReview, Sunday-Review, Technology, Television, Tennis, Theater, TMagazine, Travel, Upshot, US, Weddings, Well, World, YourMoney')
        }).transform((values)=>{
            if ('cn' === values.region) return 'https://cn.nytimes.com/rss/';
            return `https://rss.nytimes.com/services/xml/rss/nyt/${values.section || 'HomePage'}.xml`;
        });
        const nytimes = (0, utils.aM)({
            name: 'get-nytimes-news',
            description: '获取纽约时报新闻，包含国际政治、经济金融、社会文化、科学技术及艺术评论的高质量英文或中文国际新闻资讯',
            zodSchema: nytimesRequestSchema,
            func: async (args)=>{
                const url = nytimesRequestSchema.parse(args);
                return (0, utils.uf)(url);
            }
        });
    },
    "./src/tools/smzdm.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>smzdm
        });
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        const smzdmRequestSchema = external_zod_.z.object({
            unit: external_zod_.z.union([
                external_zod_.z.literal(1).describe('今日热门'),
                external_zod_.z.literal(7).describe('周热门'),
                external_zod_.z.literal(30).describe('月热门')
            ]).optional().default(1)
        });
        const smzdm = (0, utils.aM)({
            name: 'get-smzdm-rank',
            description: '获取什么值得买热门，包含商品推荐、优惠信息、购物攻略、产品评测及消费经验分享的实用中文消费类资讯',
            zodSchema: smzdmRequestSchema,
            func: async (args)=>{
                const { unit } = smzdmRequestSchema.parse(args);
                const resp = await utils.dJ.get('https://post.smzdm.com/rank/json_more', {
                    params: {
                        unit
                    }
                });
                if (0 !== resp.data.error_code || !Array.isArray(resp.data.data)) throw new Error(resp.data.error_msg || '获取什么值得买热门失败');
                return resp.data.data.map((item)=>{
                    var _safeJsonParse;
                    return {
                        title: item.title,
                        description: item.content,
                        cover: item.pic_url,
                        author: item.nickname,
                        publish_time: item.publish_time,
                        collection_count: item.collection_count,
                        comment_count: item.comment_count,
                        up_count: item.up_count,
                        hashtags: null === (_safeJsonParse = (0, utils.D6)(item.tag)) || void 0 === _safeJsonParse ? void 0 : _safeJsonParse.map((tag)=>`#${tag.title}`).join(' '),
                        link: item.article_url
                    };
                });
            }
        });
    },
    "./src/tools/sspai.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>sspai
        });
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        const sspaiRequestSchema = external_zod_.z.object({
            tag: external_zod_.z["enum"]([
                '热门文章',
                '应用推荐',
                '生活方式',
                '效率技巧',
                '少数派播客'
            ]).optional().default('热门文章').describe('分类'),
            limit: external_zod_.z.number().int().optional().default(40)
        });
        const sspai = (0, utils.aM)({
            name: 'get-sspai-rank',
            description: '获取少数派热榜，包含数码产品评测、软件应用推荐、生活方式指南及效率工作技巧的优质中文科技生活类内容',
            zodSchema: sspaiRequestSchema,
            func: async (args)=>{
                const { tag, limit } = sspaiRequestSchema.parse(args);
                const resp = await utils.dJ.get('https://sspai.com/api/v1/article/tag/page/get', {
                    params: {
                        tag,
                        limit
                    }
                });
                if (0 !== resp.data.error || !Array.isArray(resp.data.data)) throw new Error(resp.data.msg || '获取少数派热榜失败');
                return resp.data.data.map((item)=>({
                        title: item.title,
                        summary: item.summary,
                        author: item.author.nickname,
                        released_time: utils.Bv.unix(item.released_time).toISOString(),
                        comment_count: item.comment_count,
                        like_count: item.like_count,
                        view_count: item.view_count,
                        link: `https://sspai.com/post/${item.id}`
                    }));
            }
        });
    },
    "./src/tools/tencent-news.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>tencent_news
        });
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        const tencentNewsRequestSchema = external_zod_.z.object({
            page_size: external_zod_.z.number().int().optional().default(20)
        });
        const tencent_news = (0, utils.aM)({
            name: 'get-tencent-news-trending',
            description: '获取腾讯新闻热点榜，包含国内外时事、社会热点、财经资讯、娱乐动态及体育赛事的综合性中文新闻资讯',
            zodSchema: tencentNewsRequestSchema,
            func: async (args)=>{
                var _resp_data_idlist;
                const { page_size } = tencentNewsRequestSchema.parse(args);
                const resp = await utils.dJ.get('https://r.inews.qq.com/gw/event/hot_ranking_list', {
                    params: {
                        page_size
                    }
                });
                if (0 !== resp.data.ret || !Array.isArray(null === (_resp_data_idlist = resp.data.idlist) || void 0 === _resp_data_idlist ? void 0 : _resp_data_idlist[0].newslist)) throw new Error('获取腾讯新闻热点榜失败');
                return resp.data.idlist[0].newslist.filter((_, index)=>0 !== index).map((item)=>{
                    var _item_thumbnails;
                    return {
                        title: item.title,
                        description: item.abstract,
                        cover: null === (_item_thumbnails = item.thumbnails) || void 0 === _item_thumbnails ? void 0 : _item_thumbnails[0],
                        source: item.source,
                        popularity: item.hotEvent.hotScore,
                        publish_time: item.time,
                        link: item.url
                    };
                });
            }
        });
    },
    "./src/tools/thepaper.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>thepaper
        });
        var utils = __webpack_require__("./src/utils/index.ts");
        const thepaper = (0, utils.aM)({
            name: 'get-thepaper-trending',
            description: '获取澎湃新闻热榜，包含时政要闻、财经动态、社会事件、文化教育及深度报道的高质量中文新闻资讯',
            func: async ()=>{
                const resp = await utils.dJ.get('https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar');
                if (1 !== resp.data.resultCode || !Array.isArray(resp.data.data.hotNews)) throw new Error(resp.data.resultMsg || '获取澎湃新闻热榜失败');
                return resp.data.data.hotNews.map((item)=>{
                    var _item_tagList;
                    return {
                        title: item.name,
                        cover: item.pic,
                        popularity: item.praiseTimes,
                        publish_time: (0, utils.Bv)(item.pubTimeLong).toISOString(),
                        hashtags: null === (_item_tagList = item.tagList) || void 0 === _item_tagList ? void 0 : _item_tagList.map((tag)=>`#${tag.tag}`).join(' '),
                        link: `https://www.thepaper.cn/newsDetail_forward_${item.contId}`
                    };
                });
            }
        });
    },
    "./src/tools/theverge.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>theverge
        });
        var utils = __webpack_require__("./src/utils/index.ts");
        var external_node_url_ = __webpack_require__("node:url");
        const theverge = (0, utils.aM)({
            name: 'get-theverge-news',
            description: '获取 The Verge 新闻，包含科技创新、数码产品评测、互联网趋势及科技公司动态的英文科技资讯',
            func: async ()=>{
                const rss = await (0, utils.P_)('https://www.theverge.com/rss/index.xml');
                if (!Array.isArray(rss.feed.entry)) throw new Error('获取 The Verge 新闻失败');
                return rss.feed.entry.map((item)=>{
                    let link = item.link;
                    if (!link && item.id) link = item.id;
                    const url = new external_node_url_.URL(link);
                    if (url.searchParams.has('p')) {
                        url.pathname = url.searchParams.get('p');
                        url.search = '';
                        link = url.toString();
                    }
                    return {
                        title: item.title,
                        description: item.summary,
                        publish_time: item.published,
                        link
                    };
                });
            }
        });
    },
    "./src/tools/toutiao.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>toutiao
        });
        var utils = __webpack_require__("./src/utils/index.ts");
        var external_node_url_ = __webpack_require__("node:url");
        const toutiao = (0, utils.aM)({
            name: 'get-toutiao-trending',
            description: '获取今日头条热榜，包含时政要闻、社会事件、国际新闻、科技发展及娱乐八卦等多领域的热门中文资讯',
            func: async ()=>{
                const resp = await utils.dJ.get('https://www.toutiao.com/hot-event/hot-board/', {
                    params: {
                        origin: 'toutiao_pc'
                    }
                });
                if (!Array.isArray(resp.data.data)) throw new Error('获取今日头条热榜失败');
                return resp.data.data.map((item)=>{
                    const link = new external_node_url_.URL(item.Url);
                    link.search = '';
                    return {
                        title: item.Title,
                        cover: item.Image.url,
                        popularity: item.HotValue,
                        link: link.toString()
                    };
                });
            }
        });
    },
    "./src/tools/weibo.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>weibo
        });
        var external_node_url_ = __webpack_require__("node:url");
        var utils = __webpack_require__("./src/utils/index.ts");
        const weibo = (0, utils.aM)({
            name: 'get-weibo-trending',
            description: '获取微博热搜榜，包含时事热点、社会现象、娱乐新闻、明星动态及网络热议话题的实时热门中文资讯',
            func: async ()=>{
                const resp = await utils.dJ.get('https://weibo.com/ajax/side/hotSearch');
                if (1 !== resp.data.ok || !Array.isArray(resp.data.data.realtime)) throw new Error('获取微博热搜榜失败');
                return resp.data.data.realtime.filter((item)=>1 !== item.is_ad).map((item)=>{
                    const key = item.word_scheme || `#${item.word}`;
                    const url = new external_node_url_.URL('https://s.weibo.com/weibo');
                    url.searchParams.set('q', key);
                    url.searchParams.set('band_rank', '1');
                    url.searchParams.set('Refer', 'top');
                    return {
                        title: item.word,
                        description: item.note || key,
                        popularity: item.num,
                        link: url.toString()
                    };
                });
            }
        });
    },
    "./src/tools/weread.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>weread
        });
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        var external_node_crypto_ = __webpack_require__("node:crypto");
        const wereadRequestSchema = external_zod_.z.object({
            category: external_zod_.z.union([
                external_zod_.z.literal('rising').describe('飙升榜'),
                external_zod_.z.literal('hot_search').describe('热搜榜'),
                external_zod_.z.literal('newbook').describe('新书榜'),
                external_zod_.z.literal('general_novel_rising').describe('小说榜'),
                external_zod_.z.literal('all').describe('总榜')
            ]).optional().default('rising').describe('排行榜分区')
        });
        const getWereadID = (bookId)=>{
            try {
                const hash = external_node_crypto_["default"].createHash('md5');
                hash.update(bookId);
                const str = hash.digest('hex');
                let strSub = str.substring(0, 3);
                let fa;
                if (/^\d*$/.test(bookId)) {
                    const chunks = [];
                    for(let i = 0; i < bookId.length; i += 9){
                        const chunk = bookId.substring(i, i + 9);
                        chunks.push(Number.parseInt(chunk).toString(16));
                    }
                    fa = [
                        '3',
                        chunks
                    ];
                } else {
                    let hexStr = '';
                    for(let i = 0; i < bookId.length; i++)hexStr += bookId.charCodeAt(i).toString(16);
                    fa = [
                        '4',
                        [
                            hexStr
                        ]
                    ];
                }
                strSub += fa[0];
                strSub += `2${str.substring(str.length - 2)}`;
                for(let i = 0; i < fa[1].length; i++){
                    const sub = fa[1][i];
                    const subLength = sub.length.toString(16);
                    const subLengthPadded = 1 === subLength.length ? `0${subLength}` : subLength;
                    strSub += subLengthPadded + sub;
                    if (i < fa[1].length - 1) strSub += 'g';
                }
                if (strSub.length < 20) strSub += str.substring(0, 20 - strSub.length);
                const finalHash = external_node_crypto_["default"].createHash('md5');
                finalHash.update(strSub);
                const finalStr = finalHash.digest('hex');
                strSub += finalStr.substring(0, 3);
                return strSub;
            } catch (error) {
                utils.kg.error(`处理微信读书 ID 时出现错误：${error}`);
                return;
            }
        };
        const weread = (0, utils.aM)({
            name: 'get-weread-rank',
            description: '获取微信读书排行榜，包含热门小说、畅销书籍、新书推荐及各类文学作品的阅读数据和排名信息',
            zodSchema: wereadRequestSchema,
            func: async (args)=>{
                const { category } = wereadRequestSchema.parse(args);
                const resp = await utils.dJ.get(`https://weread.qq.com/web/bookListInCategory/${category}`, {
                    params: {
                        rank: 1
                    }
                });
                if (!Array.isArray(resp.data.books)) throw new Error('获取微信读书排行榜失败');
                return resp.data.books.map((item)=>{
                    var _bookInfo_cover;
                    const { bookInfo } = item;
                    const wereadID = getWereadID(bookInfo.bookId);
                    return {
                        title: bookInfo.title,
                        description: bookInfo.intro,
                        cover: null === (_bookInfo_cover = bookInfo.cover) || void 0 === _bookInfo_cover ? void 0 : _bookInfo_cover.replace('s_', 't9_'),
                        author: bookInfo.author,
                        publish_time: bookInfo.publishTime,
                        reading_count: item.readingCount,
                        link: wereadID ? `https://weread.qq.com/web/bookDetail/${wereadID}` : void 0
                    };
                });
            }
        });
    },
    "./src/tools/zhihu.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>zhihu
        });
        var external_zod_ = __webpack_require__("zod");
        var utils = __webpack_require__("./src/utils/index.ts");
        const zhihuTrendingSchema = external_zod_.z.object({
            limit: external_zod_.z.number().optional().default(50)
        });
        const zhihu = (0, utils.aM)({
            name: 'get-zhihu-trending',
            description: '获取知乎热榜，包含时事热点、社会话题、科技动态、娱乐八卦等多领域的热门问答和讨论的中文资讯',
            zodSchema: zhihuTrendingSchema,
            func: async (args)=>{
                const { limit } = zhihuTrendingSchema.parse(args);
                const resp = await utils.dJ.get('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total', {
                    params: {
                        limit
                    },
                    headers: {
                        'User-Agent': 'osee2unifiedRelease/22916 osee2unifiedReleaseVersion/10.49.0 Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                        'x-app-versioncode': '22916',
                        'x-app-bundleid': 'com.zhihu.ios',
                        'x-app-build': 'release',
                        'x-package-ytpe': 'appstore',
                        'x-app-za': 'OS=iOS&Release=18.5&Model=iPhone17,2&VersionName=10.49.0&VersionCode=22916&Width=1290&Height=2796&DeviceType=Phone&Brand=Apple&OperatorType=6553565535'
                    }
                });
                if (!Array.isArray(resp.data.data)) throw new Error('获取知乎热榜失败');
                return resp.data.data.map((item)=>{
                    var _item_target;
                    const data = item.target;
                    const id = null === (_item_target = item.target) || void 0 === _item_target ? void 0 : _item_target.url.split('/').pop();
                    return {
                        title: data.title,
                        description: data.excerpt,
                        cover: item.children[0].thumbnail,
                        created: utils.Bv.unix(data.created).toISOString(),
                        popularity: item.detail_text,
                        link: id ? `https://www.zhihu.com/question/${id}` : void 0
                    };
                });
            }
        });
    },
    "./src/utils/index.ts": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.d(__webpack_exports__, {
            Dz: ()=>cacheStorage,
            P_: ()=>getRss,
            uf: ()=>getRssItems,
            WB: ()=>handleErrorResult,
            HL: ()=>handleSuccessResult,
            aM: ()=>defineToolConfig,
            Bv: ()=>__WEBPACK_EXTERNAL_MODULE_dayjs__["default"],
            kg: ()=>logger,
            dJ: ()=>http,
            CE: ()=>omit,
            D6: ()=>safeJsonParse
        });
        var external_zod_ = __webpack_require__("zod");
        class CacheStorage {
            get cachePath() {
                const cachePath = __WEBPACK_EXTERNAL_MODULE_node_path_c5b9b54f__["default"].join(__WEBPACK_EXTERNAL_MODULE_node_os_74b4b876__["default"].tmpdir(), 'mcp-trends-hub', 'cache');
                if (!__WEBPACK_EXTERNAL_MODULE_node_fs_5ea92f0c__["default"].existsSync(cachePath)) __WEBPACK_EXTERNAL_MODULE_node_fs_5ea92f0c__["default"].mkdirSync(cachePath, {
                    recursive: true
                });
                return cachePath;
            }
            getPathByKey(key) {
                return __WEBPACK_EXTERNAL_MODULE_node_path_c5b9b54f__["default"].join(this.cachePath, key);
            }
            getItem(key) {
                const itemPath = this.getPathByKey(key);
                if (!__WEBPACK_EXTERNAL_MODULE_node_fs_5ea92f0c__["default"].existsSync(itemPath)) return null;
                return __WEBPACK_EXTERNAL_MODULE_node_fs_5ea92f0c__["default"].readFileSync(itemPath, 'utf-8');
            }
            setItem(key, value) {
                const itemPath = this.getPathByKey(key);
                __WEBPACK_EXTERNAL_MODULE_node_fs_5ea92f0c__["default"].writeFileSync(itemPath, value);
            }
            removeItem(key) {
                const itemPath = this.getPathByKey(key);
                if (!__WEBPACK_EXTERNAL_MODULE_node_fs_5ea92f0c__["default"].existsSync(itemPath)) return;
                __WEBPACK_EXTERNAL_MODULE_node_fs_5ea92f0c__["default"].unlinkSync(itemPath);
            }
            clear() {
                __WEBPACK_EXTERNAL_MODULE_node_fs_5ea92f0c__["default"].rmSync(this.cachePath, {
                    recursive: true
                });
            }
        }
        const cacheStorage = new CacheStorage();
        __WEBPACK_EXTERNAL_MODULE_dayjs__["default"].locale('zh-cn');
        const http = __WEBPACK_EXTERNAL_MODULE_axios__["default"].create();
        function _define_property(obj, key, value) {
            if (key in obj) Object.defineProperty(obj, key, {
                value: value,
                enumerable: true,
                configurable: true,
                writable: true
            });
            else obj[key] = value;
            return obj;
        }
        class Logger {
            get logPath() {
                return __WEBPACK_EXTERNAL_MODULE_node_path_c5b9b54f__["default"].resolve('app.log');
            }
            setMcpServer(mcpServer) {
                this.mcpServer = mcpServer;
            }
            log(level, data) {}
            info(data) {
                this.log('info', data);
            }
            error(data) {
                this.log('error', data);
            }
            warn(data) {
                this.log('warning', data);
            }
            debug(data) {
                this.log('debug', data);
            }
            constructor(){
                _define_property(this, "mcpServer", null);
            }
        }
        const logger = new Logger();
        const getRss = async (url)=>{
            const resp = await http.get(url);
            const parser = new __WEBPACK_EXTERNAL_MODULE_fast_xml_parser_1c5d6bda__.XMLParser();
            return parser.parse(resp.data);
        };
        const getRssItems = async (url)=>{
            var _data_rss_channel, _data_rss;
            const data = await getRss(url);
            if (!Array.isArray(null === (_data_rss = data.rss) || void 0 === _data_rss ? void 0 : null === (_data_rss_channel = _data_rss.channel) || void 0 === _data_rss_channel ? void 0 : _data_rss_channel.item)) return [];
            return data.rss.channel.item.map((item)=>{
                let category = '';
                if ('string' == typeof item.category) category = item.category;
                if (Array.isArray(item.category)) category = item.category.join(', ');
                return {
                    title: item.title,
                    description: item.description,
                    category,
                    author: item.author || item['dc:creator'],
                    publish_time: item.pubDate,
                    link: item.link
                };
            });
        };
        const defineToolConfig = async (config)=>{
            if ('function' == typeof config) return await config();
            return config;
        };
        const handleErrorResult = (error)=>{
            let errorMessage = '';
            errorMessage = error instanceof external_zod_.ZodError ? (0, __WEBPACK_EXTERNAL_MODULE_zod_validation_error_1fd569e4__.fromError)(error).toString() : error instanceof Error ? error.message : JSON.stringify(error);
            return {
                content: [
                    {
                        type: 'text',
                        text: errorMessage
                    }
                ],
                isError: true
            };
        };
        const handleSuccessResult = (results, toolName)=>{
            const hiddenFields = (process.env.TRENDS_HUB_HIDDEN_FIELDS ?? '').split(',').filter(Boolean).reduce((fields, config)=>{
                if (config.includes(':')) {
                    const [tool, key] = config.split(':');
                    if (tool === toolName) fields.push(key);
                } else fields.push(config);
                return fields;
            }, []);
            return {
                content: results.map((item)=>({
                        type: 'text',
                        text: Object.entries(item).filter(([key, value])=>!hiddenFields.includes(key) && null != value && '' !== value).map(([key, value])=>`<${key}>${String(value)}</${key}>`).join('\n')
                    }))
            };
        };
        const safeJsonParse = (json)=>{
            try {
                return JSON.parse(json);
            } catch  {
                return;
            }
        };
        const omit = (obj, keys)=>Object.keys(obj).reduce((acc, key)=>{
                if (!keys.includes(key)) {
                    const k = key;
                    acc[k] = obj[k];
                }
                return acc;
            }, {});
    },
    "node:crypto": function(module) {
        module.exports = __WEBPACK_EXTERNAL_MODULE_node_crypto_9ba42079__;
    },
    "node:url": function(module) {
        module.exports = __WEBPACK_EXTERNAL_MODULE_node_url_e96de089__;
    },
    zod: function(module) {
        module.exports = __WEBPACK_EXTERNAL_MODULE_zod__;
    }
};
var __webpack_module_cache__ = {};
function __webpack_require__(moduleId) {
    var cachedModule = __webpack_module_cache__[moduleId];
    if (void 0 !== cachedModule) return cachedModule.exports;
    var module = __webpack_module_cache__[moduleId] = {
        exports: {}
    };
    __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
    return module.exports;
}
(()=>{
    __webpack_require__.d = (exports, definition)=>{
        for(var key in definition)if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) Object.defineProperty(exports, key, {
            enumerable: true,
            get: definition[key]
        });
    };
})();
(()=>{
    __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop);
})();
(()=>{
    __webpack_require__.r = (exports)=>{
        if ('undefined' != typeof Symbol && Symbol.toStringTag) Object.defineProperty(exports, Symbol.toStringTag, {
            value: 'Module'
        });
        Object.defineProperty(exports, '__esModule', {
            value: true
        });
    };
})();
var external_zod_ = __webpack_require__("zod");
var utils = __webpack_require__("./src/utils/index.ts");
async function loadToolConfigurations(toolsContext) {
    const toolPromises = toolsContext.keys().map((key)=>{
        const toolModule = toolsContext(key);
        return toolModule.default.catch((error)=>{
            utils.kg.error(`Failed to load tool from ${key}`);
            return null;
        });
    });
    const validTools = (await Promise.all(toolPromises)).filter((tool)=>!!tool);
    const toolConfigMap = new Map(validTools.map((tool)=>[
            tool.name,
            tool
        ]));
    return {
        toolConfigMap,
        validTools
    };
}
const mcpServer = new __WEBPACK_EXTERNAL_MODULE__modelcontextprotocol_sdk_server_mcp_js_2c42c5d0__.McpServer({
    name: 'Trends Hub',
    version: "1.6.2"
}, {
    capabilities: {
        tools: {},
        logging: {}
    }
});
utils.kg.setMcpServer(mcpServer);
(async ()=>{
    try {
        const toolsContext = __webpack_require__("./src/tools sync recursive \\.(js%7Cts)$");
        const { toolConfigMap, validTools } = await loadToolConfigurations(toolsContext);
        mcpServer.server.setRequestHandler(__WEBPACK_EXTERNAL_MODULE__modelcontextprotocol_sdk_types_js_fc45a208__.ListToolsRequestSchema, async ()=>({
                tools: validTools.map((tool)=>{
                    const { name, description, zodSchema = external_zod_.z.object({}) } = tool;
                    return {
                        name,
                        description,
                        inputSchema: (0, __WEBPACK_EXTERNAL_MODULE_zod_to_json_schema_a1d75503__["default"])(zodSchema)
                    };
                })
            }));
        mcpServer.server.setRequestHandler(__WEBPACK_EXTERNAL_MODULE__modelcontextprotocol_sdk_types_js_fc45a208__.CallToolRequestSchema, async (request)=>{
            try {
                const tool = toolConfigMap.get(request.params.name);
                if (!tool) throw new Error(`Tool not found: ${request.params.name}`);
                const result = await tool.func(request.params.arguments ?? {});
                return (0, utils.HL)(result, request.params.name);
            } catch (error) {
                return (0, utils.WB)(error);
            }
        });
        const transport = new __WEBPACK_EXTERNAL_MODULE__modelcontextprotocol_sdk_server_stdio_js_4f861174__.StdioServerTransport();
        await mcpServer.connect(transport);
    } catch (error) {
        utils.kg.error('Failed to start MCP server');
        utils.kg.error(error);
        process.exit(1);
    }
})();
