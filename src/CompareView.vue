<script setup>
import { ref, computed, watch } from 'vue'
import { analyzeText } from './counter.js'
import { analyzeJa } from './analyzeService.js'
import { parseLyricFile } from './lyrics.js'
import { t } from './i18n.js'

const props = defineProps({
  uiLang: { type: String, default: 'zh' }
})

const jaText = ref('')
const zhText = ref('')
const jaLoading = ref(false)
const jaMode = ref('online')
const fileJa = ref(null)
const fileZh = ref(null)
const toastMsg = ref('')
const toastVisible = ref(false)

const jaSample = '今日の 花嫁\nこれからの 生涯の 友\n全て 分かち合う 二人\n共に 生きてゆく'
const zhSample = '今日的新娘\n从此一生的朋友\n所有的都与你分享\n一起携手走下去'

const jaAnalysis = ref({ lines: [], total: 0 })
const zhAnalysis = computed(() => analyzeText(zhText.value, 'zh'))

function showToast(msg) {
  toastMsg.value = msg
  toastVisible.value = true
  clearTimeout(showToast._t)
  showToast._t = setTimeout(() => (toastVisible.value = false), 2200)
}

let timer = null
async function runJa() {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    if (!jaText.value.trim()) {
      jaAnalysis.value = { lines: [], total: 0 }
      return
    }
    jaLoading.value = true
    try {
      const { mode, result } = await analyzeJa(jaText.value, 1)
      jaMode.value = mode
      jaAnalysis.value = result
    } finally {
      jaLoading.value = false
    }
  }, 500)
}
watch(jaText, runJa)

function applySample(lang) {
  if (lang === 'ja') jaText.value = jaSample
  else zhText.value = zhSample
}
function clearText(lang) {
  if (lang === 'ja') jaText.value = ''
  else zhText.value = ''
}

function pickFile(lang) {
  if (lang === 'ja') fileJa.value && fileJa.value.click()
  else fileZh.value && fileZh.value.click()
}
function onFileChange(e, lang) {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const content = String(reader.result || '')
    const parsed = parseLyricFile(file.name, content)
    if (!parsed) return
    if (lang === 'ja') {
      jaText.value = parsed.text
      showToast(t(props.uiLang, 'cmpImported').replace('{name}', file.name))
    } else {
      zhText.value = parsed.text
      showToast(t(props.uiLang, 'cmpImported').replace('{name}', file.name))
    }
  }
  reader.readAsText(file)
}

// 对齐行（自动剔除两边空白/空格行）
const compareRows = computed(() => {
  const jaLines = (jaAnalysis.value.lines || []).filter((l) => l.text.trim())
  const zhLines = (zhAnalysis.value.lines || []).filter((l) => l.text.trim())
  const max = Math.max(jaLines.length, zhLines.length)
  const rows = []
  for (let i = 0; i < max; i++) {
    const jl = jaLines[i] || null
    const zl = zhLines[i] || null
    if (!jl) continue // 中文行没有对应日文行时忽略
    const zh = zl ? zl.total : null
    rows.push({
      idx: i + 1,
      jaText: jl.text,
      jaTotal: jl.total,
      zhText: zl ? zl.text : '',
      zhTotal: zh,
      differ: zh !== null && zh !== jl.total,
      hasZh: zh !== null
    })
  }
  return rows
})

const diffCount = computed(
  () => compareRows.value.filter((r) => r.differ).length
)

async function copyText(textToCopy) {
  try {
    await navigator.clipboard.writeText(textToCopy)
    showToast(t(props.uiLang, 'copied'))
  } catch (err) {
    const ta = document.createElement('textarea')
    ta.value = textToCopy
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      showToast(t(props.uiLang, 'copied'))
    } catch (e2) {
      showToast(t(props.uiLang, 'importHint'))
    }
    document.body.removeChild(ta)
  }
}

function diffMark(row) {
  if (!row.hasZh) return t(props.uiLang, 'cmpNoMatch')
  return row.differ ? '✗' : '✓'
}

function copyRow(row) {
  const diff = diffMark(row)
  const line =
    `${t(props.uiLang,'cmpLine')}${row.idx}\t` +
    `${row.jaText}\t(${row.jaTotal}${t(props.uiLang,'cmpJaUnit')})\t` +
    `${row.zhText || t(props.uiLang,'cmpNoMatch')}` +
    `${row.hasZh ? '\t(' + row.zhTotal + t(props.uiLang,'cmpZhUnit') + ')' : ''}\t` +
    diff
  copyText(line)
}

function copyAll() {
  const header = `${t(props.uiLang,'appTitle')} · ${t(props.uiLang,'modeCompare')}`
  const colTitle =
    `${t(props.uiLang,'cmpLine')}\t` +
    `${t(props.uiLang,'cmpJa')}\t${t(props.uiLang,'cmpJaUnit')}\t` +
    `${t(props.uiLang,'cmpZh')}\t${t(props.uiLang,'cmpZhUnit')}\t` +
    `${t(props.uiLang,'cmpResult')}`
  const rows = compareRows.value.map((r) => {
    const diff = diffMark(r)
    return (
      `${r.idx}\t` +
      `${r.jaText}\t${r.jaTotal}\t` +
      `${r.zhText || t(props.uiLang,'cmpNoMatch')}\t` +
      `${r.hasZh ? r.zhTotal : '—'}\t${diff}`
    )
  })
  copyText([header, colTitle, ...rows].join('\n'))
}
</script>

<template>
  <div class="compare">
    <div class="cmp-inputs">
      <section class="panel input-panel">
        <div class="panel-head">
          <label>{{ t(uiLang, 'cmpJa') }}</label>
          <div class="head-actions">
            <button class="ghost" @click="pickFile('ja')">
              📂 {{ t(uiLang, 'cmpImportJa') }}
            </button>
            <button class="ghost" @click="applySample('ja')">
              {{ t(uiLang, 'sample') }}
            </button>
            <button class="ghost" @click="clearText('ja')">
              {{ t(uiLang, 'clear') }}
            </button>
          </div>
        </div>
        <textarea
          v-model="jaText"
          class="input"
          :placeholder="t(uiLang, 'cmpPlaceholderJa')"
          spellcheck="false"
        ></textarea>
        <input ref="fileJa" type="file" accept=".lrc,.ass,.ssa,.srt,.txt" class="hidden-file" @change="onFileChange($event,'ja')" />
        <p v-if="jaLoading" class="loading-row"><span class="spinner"></span>{{ t(uiLang, 'loadingRead') }}</p>
      </section>

      <section class="panel input-panel">
        <div class="panel-head">
          <label>{{ t(uiLang, 'cmpZh') }}</label>
          <div class="head-actions">
            <button class="ghost" @click="pickFile('zh')">
              📂 {{ t(uiLang, 'cmpImportZh') }}
            </button>
            <button class="ghost" @click="applySample('zh')">
              {{ t(uiLang, 'sample') }}
            </button>
            <button class="ghost" @click="clearText('zh')">
              {{ t(uiLang, 'clear') }}
            </button>
          </div>
        </div>
        <textarea
          v-model="zhText"
          class="input"
          :placeholder="t(uiLang, 'cmpPlaceholderZh')"
          spellcheck="false"
        ></textarea>
        <input ref="fileZh" type="file" accept=".lrc,.ass,.ssa,.srt,.txt" class="hidden-file" @change="onFileChange($event,'zh')" />
      </section>
    </div>

    <section class="panel cmp-result">
      <div class="summary">
        <span>{{ t(uiLang, 'cmpSummary').replace('{total}', compareRows.length).replace('{diff}', diffCount) }}</span>
        <span v-if="jaMode === 'estimate'" class="mode-chip estimate">
          {{ t(uiLang, 'readingEstimate') }}
        </span>
        <button class="ghost copy-btn" @click="copyAll">
          ⧉ {{ t(uiLang, 'cmpCopyAll') }}
        </button>
      </div>

      <div class="cmp-table-wrap">
        <table class="cmp-table">
          <thead>
            <tr>
              <th>{{ t(uiLang, 'cmpLine') }}</th>
              <th>{{ t(uiLang, 'cmpJa') }}</th>
              <th class="num">{{ t(uiLang, 'statTotal') }}({{ t(uiLang,'cmpJaUnit') }})</th>
              <th>{{ t(uiLang, 'cmpZh') }}</th>
              <th class="num">{{ t(uiLang, 'statTotal') }}({{ t(uiLang,'cmpZhUnit') }})</th>
              <th class="num">{{ t(uiLang, 'cmpResult') }}</th>
              <th class="row-copy-head"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in compareRows" :key="r.idx" :class="{ differ: r.differ, match: !r.differ }">
              <td class="line-no">{{ r.idx }}</td>
              <td class="ja">{{ r.jaText }}</td>
              <td class="num ja-num" :class="{ hot: r.differ }">{{ r.jaTotal }}</td>
              <td class="zh">{{ r.zhText || t(uiLang,'cmpNoMatch') }}</td>
              <td class="num zh-num" :class="{ hot: r.differ }">{{ r.zhTotal ?? '—' }}</td>
              <td class="num result-cell">
                <span v-if="!r.hasZh" class="r-none">{{ t(uiLang,'cmpNoMatch') }}</span>
                <span v-else-if="r.differ" class="r-diff">✗</span>
                <span v-else class="r-ok">✓</span>
              </td>
              <td class="row-copy">
                <button class="ghost mini" @click="copyRow(r)" :title="t(uiLang,'cmpCopyRow')">
                  ⧉
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.compare {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cmp-inputs {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.cmp-inputs .input-panel textarea {
  height: 200px;
}
.cmp-result {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.cmp-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.cmp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.cmp-table th {
  text-align: left;
  color: var(--text-dim);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--panel);
}
.cmp-table th.num,
.cmp-table td.num {
  text-align: center;
  width: 70px;
}
.cmp-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.cmp-table .ja {
  color: var(--text);
}
.cmp-table .zh {
  color: var(--text-dim);
}
.cmp-table td.line-no {
  color: var(--text-dim);
  width: 40px;
}
.cmp-table tr.differ {
  background: rgba(246, 168, 33, 0.12);
  border-left: 3px solid var(--accent);
}
.cmp-table tr.differ td.num.hot {
  color: var(--accent);
  font-weight: 800;
}
.cmp-table tr.match td.num {
  color: var(--good);
  font-weight: 700;
}
.result-cell {
  width: 60px;
}
.row-copy {
  width: 36px;
  text-align: center;
}
.row-copy .ghost.mini {
  padding: 2px 6px;
  font-size: 0.8rem;
}
.cmp-result .summary .copy-btn {
  margin-left: auto;
}
.r-ok {
  color: var(--good);
  font-weight: 800;
}
.r-diff {
  color: var(--accent);
  font-weight: 800;
}
.r-none {
  color: var(--text-dim);
}
</style>
