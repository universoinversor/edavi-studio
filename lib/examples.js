// Ejemplos de cada familia, tal como los muestra Higgsfield en su catálogo público
// (open.higgsfield.ai/explore). Se enlazan desde su CDN, no se copian al repositorio.
// Para cambiarlos por tus propias creaciones, edita este archivo.
export const EXAMPLES_CDN = 'https://d28lhcrx5qdowv.cloudfront.net/media/explore/media/';

/** @type {Record<string, { type: 'video'|'image', src: string, poster?: string }>} */
export const EXAMPLES = {
  "bytedance/seedance-2.5/text-to-video": {type: "video",src: "a4daf6e7c3d458649f84c92d367cefad8aaa1052bfc409c94061a6d75d711d9c-video.mp4",poster: "1a6a226e8611b061e0b9f37ab843d6bd7bff420e46cfb72531375e9d5b2052b3-thumbnail.webp"},
  "higgsfield/genjutsu/motion-transfer/v1.0": {type: "video",src: "478325c2a854b75ffc4d59b5704be94f4db14c810039f5d3aa11bcca31c56894-video.mp4",poster: "e88805fcb31442389587a2953675fd723ee8d4cb5a317e6280b5d1cca979e152-thumbnail.webp"},
  "kling-video/v3.0/std/text-to-video": {type: "video",src: "a8482c00a810bf05f4264db8ac3ad63847b37998d258f931588e963fa8eb4435-video.mp4",poster: "ec8cf7deb35cc4a6e34b0a5ffa1c4cfbc4d2fb5bcc013e4434c2bf2383a7adb2-thumbnail.webp"},
  "minimax/h3/text-to-video": {type: "video",src: "c4d27237ec0cc455ecdfbfdec058e8c3dc052bd7f34e1433d712dd01ef69fd50-video.mp4",poster: "296b62f0b8633787bdf0892549bbd0bf5c19956ffa0a340e810249d354b6e6db-thumbnail.webp"},
  "alibaba/wan-3.0-prime/text-to-video": {type: "video",src: "11e62558e46955d7f3ac53928bc3d87117e57c1842b81842c7ec3a0a5e388fd9-video.mp4",poster: "c743629411ff8267c2920e116ce3790e5a303727efe964811b7bcf8b138b736b-thumbnail.webp"},
  "bytedance/seedance-2.0/text-to-video": {type: "video",src: "3f79179482a6cc871a92f4d4c242230817b48ecf90079c9e2e551057251664e1-video.mp4",poster: "5d978a3db6a8f758a02a658956c68d1bd43b82da96be75c83369d0bb33e48eb4-thumbnail.webp"},
  "higgsfield/cinema-studio/4.0": {type: "video",src: "cf76b0c05e5ac8154b16bd24238d7527c837452db713691fa6d9db4bea7a7b3d-video.mp4",poster: "24fc2ccb2207a9d37b094f6da28c9055d73e98a02dddfa8d3b1c7d17b05865d8-thumbnail.webp"},
  "alibaba/wan-3.0/text-to-video": {type: "video",src: "2622d492d3b91a0008f474df204198591c4bd919f2bdb5caf0b437785faabf71-video.mp4",poster: "60afab4a59dce64dd5447fb7ebd295653cf9d5d40fad84960f4246ca4b5d3d24-thumbnail.webp"},
  "lightricks/ltx-2.5/text-to-video/fast": {type: "video",src: "c0cbaa14613ea54e10a1ef30525d4bc8760635c87eff92315147a34d1ddf88aa-video.mp4",poster: "e4972ad8354781935712bd0fffcebb2347dee2270a46d039bfa6369bcef2fd3f-thumbnail.webp"},
  "lightricks/ltx-2.5/text-to-video/pro": {type: "video",src: "8e43510a30ca041b2bc3ad27268a39e22545c6a2e6b115156a7a078e39f83b4e-video.mp4",poster: "119425a2f67c982384c036fac72c3a9e906a16f6be75b2e07fcca0d6ba842569-thumbnail.webp"},
  "xai/grok-imagine-video/v1.5/reference-to-video": {type: "video",src: "4b6bdf531404f58760063165002ea79a92bad7fb30ad47ad2f560cb0088830b9-video.mp4",poster: "8be68e2417b7a5834ad70ae5011fe76f38e3a16d8d7df74a0a329ffcd2e06b91-thumbnail.webp"},
  "wan/v2.7/text-to-video": {type: "video",src: "f23e4ba931b1d9bb586d44dcadc066537963180379e2aa142317c0fb43240822-video.mp4",poster: "7254bd5404ad90ce9323317e02d70db51d78b1bcf0fba165b326784f1c7f06b6-thumbnail.webp"},
  "alibaba/happy-horse/v1.1/text-to-video": {type: "video",src: "595cde9ce26a47e33706b23a6eda4638d6104c8f4a3971943a9101b5eb95bf2b-video.mp4",poster: "a9f29388208cd195e6020ecd329ac02a4f3931c69cbbde290a369dc9a9d88832-thumbnail.webp"},
  "alibaba/happy-horse/text-to-video": {type: "video",src: "0eefb690df13e38e2c8c725df6a3079c22e66817fa2664afa03b2e52eae8b5bb-video.mp4",poster: "0fbf86582995835b04aa7c69f162372989be5f5e8227ad9f178caa0358c25974-thumbnail.webp"},
  "pixverse/v6/text-to-video": {type: "video",src: "1b8ec05136532b0b87cf7d1bc78e3420350f9a3ae73c600d05666de6c6765fb3-video.mp4",poster: "ad86ec99104e2e71f2d6f4627d0a072e7812f1f5f07eee1cf744e1d977880455-thumbnail.webp"},
  "kling-video/o3/first-last-frame": {type: "video",src: "146f6737e62f65953dd51656b777d58511ac6bd483e0996fef424e6ad628f852-video.mp4",poster: "46a32ff0ac3a1faef820b57a73e362de6e14b64dcc7991b8cd4352c6ef372fbd-thumbnail.webp"},
  "kling-video/v2.6/pro/text-to-video": {type: "video",src: "1c954a18d5fad24ad0a5a2cbde5392644d9aede18882f92ae70d01ab76b4c8cb-video.mp4",poster: "585a8ad10ccec6541e033d45a6abe629f0898a7d80dc614b01f56603444cfb66-thumbnail.webp"},
  "kling-video/omni/first-last-frame": {type: "video",src: "91ba71d9c7d870e276dad544e9f08cf749b99d2dd73f5e004dcd086c89900859-video.mp4",poster: "22fdafb767ca6f03ed7d9080dc43bb1af1d11658551bbd330bad1ce571a4dfc6-thumbnail.webp"},
  "wan/v2.6/text-to-video": {type: "video",src: "3e403a0b1e95acc0b18e66b1c5965f50f38ad8cd30a3204648aef6c00b1ee12b-video.mp4",poster: "9f15017084d15d7a09f63e249a427f9f3dc140b2f5126b3bbf45b7a2a9bfe3a8-thumbnail.webp"},
  "minimax/hailuo-2.3/standard/text-to-video": {type: "video",src: "10d1c1a05b8e65b8e0f8c5f1a9aa9366961361a5447102e526eee3937f6b4b89-video.mp4",poster: "60fabab44d6ffdf2f90155967c67662d3f7107439bfde9cc279ff003efdc36b7-thumbnail.webp"},
  "kling-video/v2.5-turbo/standard/image-to-video": {type: "video",src: "cea530ebbfe9eb51079d38ca7d17ae81a3523ba0f006a3aed311c8942fcc7363-video.mp4",poster: "f4c86c7fde4afab2a33903caa94fbd8b89ddebcd83821fbb8ebb3040aa0dd021-thumbnail.webp"},
  "marketing-studio/image": {type: "image",src: "7ff805cfc3c70a2ca923b1a9002b04e91f6d627dd4d302afe09797ae2e3ca44a-image.webp"},
  "xai/grok-imagine-image-2.0": {type: "image",src: "d33e1b969add4c0e54ad3f0c22e0a46c2ad5bc96372525e89230fbad2177ece1-image.webp"},
  "higgsfield-ai/soul/v2/standard": {type: "image",src: "52a6ceab9e44aa8dea42343c337a6b236690253920b4a2181b6c45cbb023ce49-image.webp"},
  "ideogram/v4.0": {type: "image",src: "aa642d35ed929d33feab8bbe4389d33ad8f65e384576ed6a25532e762c94bbd0-image.webp"},
  "recraft/v4.1/text-to-image": {type: "image",src: "e1451eeadce1f0aef53f6773fc57ae95dcde45679cf90d0c6d6c1baecd500a24-image.webp"},
  "higgsfield-ai/soul/standard": {type: "image",src: "dfb9e5132b364597cfbd85730ade54498adadc113a47d50ea8458ae98185fa43-image.webp"},
  "alibaba/qwen-image-3/text-to-image": {type: "image",src: "1414a0e1959b5300c286cadaad198491fd4c50c7bef46a0133a4cc35f8cefce0-image.webp"},
  "z-image/turbo": {type: "image",src: "48b4796091385740976c26b2664a0142768b84c74c48f3711c52ac014e13a66a-image.webp"},
};

// Familias sin ejemplo propio: usan el de su familia hermana.
const FAMILY_ALIAS = {
  'kling-3-motion-control': 'kling-video/v3.0/std/text-to-video',
  'kling-2-6-motion-control': 'kling-video/v2.6/pro/text-to-video',
  'recraft-v4-1-pro': 'recraft/v4.1/text-to-image',
  'recraft-v4-1-utility': 'recraft/v4.1/text-to-image',
  'recraft-v4-1-utility-pro': 'recraft/v4.1/text-to-image',
  'soul-cinema': 'higgsfield-ai/soul/v2/standard',
};

const url = (file) => (file ? EXAMPLES_CDN + file : undefined);

function build(e) {
  return { type: e.type, src: url(e.src), poster: url(e.poster || (e.type === 'image' ? e.src : undefined)) };
}

/**
 * Ejemplo para una familia: primero sus propios modos, después cualquier modelo
 * del catálogo con el mismo familyId (p. ej. Seedance 2.5 en Transformar) y por último el alias.
 * @param {{ id: string, models: Array<{ endpoint: string }> }} family
 * @param {Array<{ endpoint: string, familyId: string }>} [catalog]
 */
export function exampleFor(family, catalog = []) {
  const candidates = [...family.models, ...catalog.filter((m) => m.familyId === family.id)];
  for (const m of candidates) if (EXAMPLES[m.endpoint]) return build(EXAMPLES[m.endpoint]);
  const alias = FAMILY_ALIAS[family.id];
  return alias && EXAMPLES[alias] ? build(EXAMPLES[alias]) : null;
}

/** @param {string} endpoint */
export function exampleForEndpoint(endpoint) {
  return EXAMPLES[endpoint] ? build(EXAMPLES[endpoint]) : null;
}
