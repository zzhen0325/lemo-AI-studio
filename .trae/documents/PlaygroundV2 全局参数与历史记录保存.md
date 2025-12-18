## 目标

* 定义并统一收集 7 个全局输入参数：`prompt`、`img_width`、`image_height`、`gen_num`、`base_model`、`lora`、`ref_image`

* 生成图片时，将参数与图片一起保存；历史记录展示图片和对应参数

* 参考图支持：本地上传图片保存到 `public/upload`，AI生成图片保存到 `public/outputs`，以路径引用

## 变更概览

* 扩展 `GenerationConfig`，加入 7 个全局参数字段（不移除现有字段，保持兼容）

* 在 `pages/playground-v2.tsx` 的生成流程中，统一填充并保存参数

* 增加两个 API 路由（App Router）：`POST /api/upload`（保存上传图片到 `public/upload`）、`POST /api/save-image`（保存生成图片到 `public/outputs`）

* 更新 `HistoryList.tsx` 展示参数信息（Tailwind 样式）

## 详细实现

### 1) 类型扩展

* 文件：`components/features/playground-v2/types.ts`

* 在 `GenerationConfig` 中新增：

  * `prompt: string`（等于 `text`）

  * `img_width: number`（等于 `width`）

  * `image_height: number`（等于 `height`）

  * `gen_num: number`（等于 `batch_size`）

  * `base_model: string`（若选“Workflow”，取 `selectedBaseModel`；否则取 `selectedModel`；其中 `seed3/seed4/nano banana` 也归属 base\_model）

  * `lora: string`（将所选 LoRA 的 `model_name` 用逗号拼接为一个字符串）

  * `ref_image?: string`（参考图路径：`/upload/...` 或 `/outputs/...`）

* 不移除现有字段，保证既有逻辑正常

### 2) 客户端参数填充与保存

* 文件：`pages/playground-v2.tsx`

* 统一构造 `savedConfig`：

  * `prompt = config.text`

  * `img_width = config.width`

  * `image_height = config.height`

  * `gen_num = config.batch_size`

  * `base_model = selectedModel === 'Workflow' ? selectedBaseModel : selectedModel`

  * `lora = selectedLoras.map(l => l.model_name).join(',')`

  * `ref_image = 已上传图片的保存路径（第一个）或空`

* 生成完成后，调用 `POST /api/save-image` 将图片写入 `public/outputs`，返回路径，保存到 `GenerationResult.imageUrl`，并将 `savedConfig` 一并写入 `GenerationResult.config`

* 编辑/生成流程（Nano banana / Seed 4.0 / ByteArtist / Workflow）统一在成功回调中执行“保存图片 + 写入 `imageUrl` 路径 + 保存参数”的逻辑

### 3) 上传图片保存到本地

* 新增 `POST /api/upload`（App Router）

  * 接收 `multipart/form-data`，校验为图片

  * 将文件保存到 `public/upload`，文件名：`<timestamp>_<random>.png|jpg`

  * 返回 JSON：`{ path: '/upload/<filename>' }`

* 修改 `handleImageUpload`：选择文件后调用该接口，拿到 `path` 保存到本地状态（扩展 `UploadedImage` 增加 `path?: string`），用于设置参数中的 `ref_image`

### 4) 生成图片保存到本地

* 新增 `POST /api/save-image`

  * 接收 JSON：`{ imageBase64: string | dataURL, ext?: 'png'|'jpg', subdir?: 'outputs'|'upload' }`

  * 将图片写入 `public/outputs`（默认）并返回 `{ path: '/outputs/<filename>' }`

  * 使用 zod 做参数校验；确保目录存在（`fs.promises.mkdir({recursive:true})`）

* 客户端在各生成分支将得到的图片（base64/URL/Blob）统一转换为 base64，再调用该接口落盘，替换 `imageUrl` 为路径

### 5) 历史记录展示参数

* 文件：`components/features/playground-v2/HistoryList.tsx`

* 在图片右侧/下方增加参数展示区域：

  * Prompt：`result.config.prompt`

  * 宽度：`result.config.img_width`

  * 高度：`result.config.image_height`

  * 数量：`result.config.gen_num`

  * 基础模型：`result.config.base_model`

  * LoRA：`result.config.lora`

  * 参考图：若有 `result.config.ref_image`，展示为缩略图或链接

* 使用 Tailwind；不引入多余依赖

### 6) 验证

* 本地：`npm run dev` 启动，分别测试四种生成路径（Nano banana/Seed4/ByteArtist/Workflow）

* 上传 1\~2 张图片，确认 `ref_image` 路径指向 `/upload/...`

* 生成成功后，确认图片可通过 `/outputs/...` 访问；历史记录参数完整显示

## 伪代码

* 类型：

```
interface GenerationConfig {
  text,width,height,batch_size,seed?,model?
  prompt,img_width,image_height,gen_num,base_model,lora,ref_image?
}
```

* 上传：

```
handleImageUpload(files){
  for file in files:
    resp = POST /api/upload (multipart)
    setUploadedImages([...,{file,base64,previewUrl,path:resp.path}])
}
```

* 生成：

```
savedConfig = {
  ...config,
  prompt:text,
  img_width:width,
  image_height:height,
  gen_num:batch_size,
  base_model: (model==='Workflow'?selectedBaseModel:selectedModel),
  lora: selectedLoras.map(n=>n.model_name).join(','),
  ref_image: uploadedImages[0]?.path
}
rawImage = await doGenerate(...)
base64 = ensureBase64(rawImage)
{path} = await POST /api/save-image({imageBase64:base64,subdir:'outputs'})
setGenerationHistory([{imageUrl:path,config:savedConfig,...},...])
```

* 历史展示：

```
<ParamsGrid>
  Prompt: config.prompt
  宽度: config.img_width
  高度: config.image_height
  数量: config.gen_num
  基础模型: config.base_model
  LoRA: config.lora
  参考图: config.ref_image && <img src={config.ref_image} />
</ParamsGrid>
```

## 兼容与约束

* 保留原有字段与逻辑；新增字段仅用于保存与展示，不影响现有生成流程

* API 使用 zod 做校验，避免无效输入与目录遍历

* 图片保存目录

