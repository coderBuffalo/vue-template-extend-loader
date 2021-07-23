# vue-template-extend-loader

vue template extending loader.

webpack.config.js

```
module.exports = {
    module: {
        rules: [
            {
                test: /\.vue$/,
                enforce: 'pre',
                loader: 'vue-template-extend-loader'
            }
        ]
    }
};
```

vue.config.js

```
module.exports = {
    chainWebpack: config => {
        config.module
            .rule()
            .test(/\.vue$/)
            .pre()
            .use()
            .loader('vue-template-extend-loader');
    }
};
```

## Usage

specify tag gacExtender in your template markup, or loader will **_`NOT`_** process your template.
specify tag gacExtend in gacExtender, place prop `query` to select base component markups, which will be process by prop `mode`.

tag gacExtend will be removed if prop `query` not exist.
tag gacExtender will be removed if it has not gacExtend markup.

- html - replace queried node's content with content. `default mode`
- replace - replace queried node with content.
- wrap - wrap queried node with content.
- append, prepend - appends or prepends content to the queried node
- after, before - inserts content before or after queried node
- remove - remove queried node.

Base Component

```
<template>
    <div>
        <div class="hello">Hello</div>
        <div class="word">word</div>
    </div>
</template>

<script>
export default {
    ....
};
</script>
```

Extender Component

```
<template>
    <gacExtender>
        <gacExtend query=".hello">
            Hello word
        </gacExtend>
        <gacExtend query=".word" mode="replace">
            <div class="hi">there!</div>
        </gacExtend>
    </gacExtender>
</template>

<script>
import Test from 'src/test';

export default {
    extends: Test
    ...
};
</script>
```

Result

```
<template>
    <div>
        <div class="hello">Hello word</div>
        <div class="hi">there!</div>
    </div>
</template>

<script>
import Test from './test';

export default {
    extends: Test
    ...
};
</script>
```
