const fs = require('fs');
const cheerio = require('cheerio');

const IMPORTS_REGEXP = /import\s+(\w+)\s+from\s+["']([^"']+)["']/;
const IMPORTS_REGEXP_GLOBAL = new RegExp(IMPORTS_REGEXP, 'g');
const EXTENDS_KEY_REGEXP = /extends:\s*(\w+)/;
const COMPONENT_NAME = /^[a-zA-Z0-9]{2,50}$/;

class Extender {
    constructor(source, callback, options, loaderInterface) {
        this.source = source;
        this.callback = callback;
        this.options = options;
        this.loaderInterface = loaderInterface;

        this.imports = [];
        this.extenders = [];

        this.init();
    }

    init() {
        const source = this.source;
        const { cheerioOptions, tag_extender } = this.options || {};
        const $ = this.$ = cheerio.load(source, cheerioOptions);;
        // imports 列表
        let imports = source.match(IMPORTS_REGEXP_GLOBAL);
        if (imports) {
            this.imports = imports.map(notation => {
                const [, variable, path] = notation.match(IMPORTS_REGEXP);
                return { variable, path };
            });
        }

        // extenders 列表
        let extenders = $(tag_extender);
        if (extenders.length) {
            this.extenders = this.getExtenders(extenders);

            // 加入依赖列表
            this.addDependency();
        } else {
            this.callback(null, source);
        }
    }

    handleExtend() {
        const callback = this.callback;
        const extenders = this.extenders || [];
        const $ = this.$;
        const { cheerioOptions, tag_template } = this.options || {};

        console.log(`${new Date().toLocaleTimeString()}🔥 -> Extender -> handleExtend -> extenders`, extenders);
        // 提前返回被清理后的内容
        if (extenders.length < 1) return callback(null, $.html());

        // 继续替换source的内容
        extenders.forEach((extender) => {
            let { ext: extEl, exts, respath } = extender;
            try {
                const base = fs.readFileSync(respath, { encoding: 'utf-8' });
                console.log(`${new Date().toLocaleTimeString()}🔥 -> Extender -> extenders.forEach -> base`, base);
                const $$ = cheerio.load(base, cheerioOptions);
    
                // 获取base的顶层template节点
                const baseTpl = $$(tag_template).eq(0);
                // 循环gacExtend指令节点, 处理base顶层template节点的HTML
                exts.forEach((_extends) => {
                    let { ext, query, mode } = _extends;
                    const baseEl = baseTpl.find(query);
                    if (baseEl.length < 1) return;
    
                    const html = query === 'remove' ? void 0 : ext.html();
                    baseEl[mode](html);
                });
    
                // 将target中gacExtender节点替换为baseTpl内容
                const html = baseTpl.html();
                extEl.replaceWith(html);
            } catch (error) {}
        });
    
        callback(null, $.html());
    }

    getExtenders(extenders) {
        console.log(`${new Date().toLocaleTimeString()}🔥 -> Extender -> getExtenders -> extenders`, extenders);
        const $ = this.$;
        const { 
            extender_prop_path, 
            tag_extends,
            extends_prop_query,
            extends_prop_mode,
            extends_prop_mode_default,
            mode: EXTENDS_MODES = {}, 
        } = this.options || {};

        const _extenders = [];
        const _emptyRemoved = (path, ext) => {
            if (!path) { ext.remove && ext.remove(); return true; }
        };
        
        let f = 0;
        extenders.map((_, el) => {
            const ext = $(el);

            let path = ext.attr(extender_prop_path);
            if (!path && !f) {
                path = this.getBaseComponentPath();
                f += 1
            };
            path = (path + '').trim();
            if (!path) return {};

            const exts = ext.find(tag_extends).map((_, el) => {
                const _ext = $(el);
                const query = _ext.attr(extends_prop_query);
                const mode = _ext.attr(extends_prop_mode) || extends_prop_mode_default;
                return { ext: _ext, query, mode };
            });
            
            return { ext, path, exts };
        }).each(async (_, extender) => {
            let { ext, path, exts } = extender;
            if (_emptyRemoved(path, ext)) return;

            // 如果路径是引入的`组件变量名`, 则从imports列表中转换
            if (COMPONENT_NAME.test(path)) {
                path = this.getImportComponentPath(path);
                if (_emptyRemoved(path, ext)) return;
            }
            
            let respath = '';
            try {
                respath = await this.resolvePath(path);
                if (_emptyRemoved(respath, ext)) return;
            } catch (error) {
                if (_emptyRemoved(null, ext)) return;
            }
            extender.respath = respath;

            let _exts = [];
            exts.each((_, _extends) => {
                let { ext, query, mode } = _extends;
                mode = EXTENDS_MODES[mode];
                if (!query || !mode || typeof ext[mode] !== 'function') {
                    if (_emptyRemoved(null, ext)) return;
                }

                _exts.push(_extends);
            });
            if (_exts.length < 1) {
                if (_emptyRemoved(null, ext)) return;
            }
            
            extender.exts = _exts;
            console.log(`${new Date().toLocaleTimeString()}🔥 -> Extender -> extenders.map -> extender`, extender);
            _extenders.push(extender);
        });
        console.log(`${new Date().toLocaleTimeString()}🔥 -> Extender -> getExtenders -> _extenders`, _extenders);

        return _extenders;
    }

    addDependency() {
        const extenders = this.extenders || [];
        if (extenders.length < 1) return;

        extenders.forEach(extender => {
            let { respath } = extender;

            respath && this.loaderInterface.addDependency(respath);
        });
    }

    resolvePath(path) {
        const loaderInterface = this.loaderInterface;

        return new Promise((resolve, reject) => {
            loaderInterface.resolve(loaderInterface.context, path, (error, result) => {
                if (error) { reject(error); }
                else { resolve(result); }
            });
        });
    }

    getBaseComponentPath() {
        const source = this.source;

        let baseComponentName = source.match(EXTENDS_KEY_REGEXP);
        if (baseComponentName) {
            baseComponentName = baseComponentName[1];
            return this.getImportComponentPath(baseComponentName);
        }

        return null;
    }

    getImportComponentPath(name) {
        const imports = this.imports || [];

        if (imports) {
            const importNotation = imports.find(({ variable }) => variable === name);
            return importNotation && importNotation.path;
        }

        return null;
    }
}

module.exports = Extender;
