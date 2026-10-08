<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { LANGUAGES, analyzeText, detectLanguage } from './counter.js'
import { analyzeJa } from './analyzeService.js'
import { parseLyricFile, stripTimestampsAny } from './lyrics.js'
import { UI_LANGS, t } from './i18n.js'
import CompareView from './CompareView.vue'

const uiLang = ref('zh')
const countLang = ref('zh')
const mode = ref('single') // 'single' | 'compare'
const text = ref('')
const kanjiMora = ref(1)
const theme = ref('dark')
const fileInput = ref(null)
const toastMsg = ref('')
const toastVisible = ref(false)
const autoDetected = ref(false)
const loading = ref(false)
const readingMode = ref('online')
const dictFallback = ref(false)
const dictActive = ref(0)
const dictLoading = ref(false)
const dictError = ref(false)

const analysis = ref({ lines: [], total: 0, lineCount: 0, unit: '' })

const samples = {
  ja: 'こんにちは世界\n今日はいい天気\nまた会おう',
  en: 'Hello world\nHow are you today',
  zh: '床前明月光\n疑是地上霜',
  ko: '안녕하세요\n오늘은 날씨가 좋아요'
}

const countTargets = computed(() => Object.values(LANGUAGES))
const langOpen = ref(false)
const langSearch = ref('')
const langSections = computed(() => {
  const q = langSearch.value.trim().toLowerCase()
  const match = (l) =>
    !q ||
    l.name.toLowerCase().includes(q) ||
    l.nameZh.includes(q) ||
    l.code.includes(q)
  const sorted = countTargets.value
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
  const childGroups = new Set()
  for (const l of sorted) if (l.group) childGroups.add(l.group)
  const sections = []
  for (const l of sorted) {
    if (l.group) continue
    if (childGroups.has(l.code)) {
      const children = sorted
        .filter((x) => x.group === l.code)
        .sort((a, b) => a.code.localeCompare(b.code))
      const visible = [l, ...children].filter(match)
      if (visible.length) {
        sections.push({ type: 'group', code: l.code, header: l, children: visible })
      }
    } else if (match(l)) {
      sections.push({ type: 'lang', lang: l })
    }
  }
  return sections
})
function groupLabel(groupCode) {
  if (groupCode === 'zh') return t(uiLang.value, 'groupChinese')
  const meta = LANGUAGES[groupCode]
  return meta ? langName(groupCode) : groupCode
}
const visibleLines = computed(() =>
  analysis.value.lines.filter((l) => l.text.trim())
)

const flagImgs = import.meta.glob('./assets/flags/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
})
function flagFor(code) {
  return flagImgs[`./assets/flags/${code}.svg`] || ''
}
function flagCss(code) {
  const meta = LANGUAGES[code]
  return meta ? meta.flag : '🏳'
}
function selectLang(code) {
  countLang.value = code
  langOpen.value = false
  langSearch.value = ''
}

function langName(code) {
  const meta = LANGUAGES[code]
  return uiLang.value === 'zh' ? meta.nameZh : meta.name
}

function showToast(msg) {
  toastMsg.value = msg
  toastVisible.value = true
  clearTimeout(showToast._t)
  showToast._t = setTimeout(() => (toastVisible.value = false), 2200)
}

async function runAnalysis() {
  const langCode = countLang.value
  // 统一剥离歌词时间轴标签（覆盖手动粘贴与文件导入）
  const textNow = stripTimestampsAny(text.value)
  if (!textNow.trim()) {
    analysis.value = { lines: [], total: 0, lineCount: 0, unit: '' }
    dictActive.value = 0
    return
  }
  if (langCode === 'ja') {
    loading.value = true
    try {
      const { mode: m, result } = await analyzeJa(textNow, kanjiMora.value)
      readingMode.value = m
      analysis.value = result
    } finally {
      loading.value = false
    }
    dictActive.value = 0
    return
  }
  readingMode.value = 'online'
  const base = analyzeText(textNow, langCode, { kanjiMora: kanjiMora.value })
  if (!dictFallback.value) {
    dictActive.value = 0
    analysis.value = base
    return
  }
  // 词典联网兜底
  const words = []
  for (const line of base.lines) {
    for (const c of line.chars) {
      if (c.type === 'word' && c.ch) words.push(c.ch)
    }
  }
  if (!words.length) {
    dictActive.value = 0
    analysis.value = base
    return
  }
  dictLoading.value = true
  dictError.value = false
  try {
    let map = {}
    if (window.appAPI && window.appAPI.dictLookup) {
      map = await window.appAPI.dictLookup(langCode, words)
    }
    let corrected = 0
    for (const line of base.lines) {
      let changed = false
      for (const c of line.chars) {
        if (c.type === 'word' && c.ch && map[c.ch] > 0) {
          const prev = c.mora
          c.mora = map[c.ch]
          c.fromDict = true
          if (prev !== c.mora) { corrected++; changed = true }
        }
      }
      if (changed) {
        line.total = line.chars.reduce((s, x) => s + (x.mora || 0), 0)
        line.dictFixed = true
      }
    }
    base.total = base.lines.reduce((s, l) => s + l.total, 0)
    dictActive.value = corrected
  } catch (e) {
    dictError.value = true
    dictActive.value = 0
  } finally {
    dictLoading.value = false
  }
  analysis.value = base
}

let timer = null
function scheduleAnalysis() {
  clearTimeout(timer)
  timer = setTimeout(runAnalysis, 500)
}

function applySample() {
  const s = samples[countLang.value]
  if (s) text.value = s
  autoDetected.value = false
}
function clearText() {
  text.value = ''
  autoDetected.value = false
}

function onPickFile() {
  fileInput.value && fileInput.value.click()
}
function onFileChange(e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const content = String(reader.result || '')
    const parsed = parseLyricFile(file.name, content)
    if (!parsed) {
      showToast(t(uiLang.value, 'importHint'))
      return
    }
    text.value = parsed.text
    const l = detectLanguage(parsed.text)
    countLang.value = l
    autoDetected.value = true
    showToast(
      t(uiLang.value, 'imported')
        .replace('{name}', file.name)
        .replace('{type}', parsed.type.toUpperCase())
        .replace('{lang}', langName(l))
    )
  }
  reader.readAsText(file)
}

async function copyResult() {
  const unit = analysis.value.unit || ''
  const lines = analysis.value.lines
    .filter((l) => l.text.trim())
    .map((l) => `${l.idx + 1}\t${l.total}${unit}\t${l.text}`)
  const header = `${t(uiLang.value, 'appTitle')} · ${langName(countLang.value)}`
  const textToCopy = [header, ...lines].join('\n')
  try {
    await navigator.clipboard.writeText(textToCopy)
    showToast(t(uiLang.value, 'copied'))
  } catch (err) {
    const ta = document.createElement('textarea')
    ta.value = textToCopy
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      showToast(t(uiLang.value, 'copied'))
    } catch (e2) {
      showToast(t(uiLang.value, 'importHint'))
    }
    document.body.removeChild(ta)
  }
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}
watch(
  theme,
  (v) => {
    document.documentElement.setAttribute('data-theme', v)
    try {
      localStorage.setItem('sc-theme', v)
    } catch (e) {}
  },
  { immediate: true }
)

watch([text, countLang, kanjiMora], scheduleAnalysis)
watch(countLang, (code) => {
  if (!text.value.trim() && samples[code]) text.value = samples[code]
  autoDetected.value = false
})

onMounted(() => {
  try {
    const saved = localStorage.getItem('sc-theme')
    if (saved) theme.value = saved
  } catch (e) {}
  text.value = samples.zh
})
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <div class="logo">♪</div>
        <div>
          <h1>{{ t(uiLang, 'appTitle') }}</h1>
          <p class="subtitle">{{ t(uiLang, 'appSubtitle') }}</p>
        </div>
      </div>
      <div class="top-actions">
        <div class="seg mode">
          <button :class="{ active: mode === 'single' }" @click="mode = 'single'">
            {{ t(uiLang, 'modeSingle') }}
          </button>
          <button :class="{ active: mode === 'compare' }" @click="mode = 'compare'">
            {{ t(uiLang, 'modeCompare') }}
          </button>
        </div>
        <button
          class="icon-btn"
          :title="theme === 'dark' ? t(uiLang,'themeLight') : t(uiLang,'themeDark')"
          @click="toggleTheme"
        >
          {{ theme === 'dark' ? '☀' : '☾' }}
        </button>
        <div class="seg ui-lang">
          <button
            v-for="l in UI_LANGS"
            :key="l"
            :class="{ active: uiLang === l }"
            @click="uiLang = l"
          >
            {{ l.toUpperCase() }}
          </button>
        </div>
      </div>
    </header>

    <main :class="mode === 'single' ? 'layout' : 'layout compare-mode'">
      <template v-if="mode === 'single'">
        <section class="panel input-panel">
          <div class="panel-head">
            <label>{{ t(uiLang, 'inputLabel') }}</label>
            <div class="head-actions">
              <button class="ghost" @click="onPickFile">
                📂 {{ t(uiLang, 'importLyric') }}
              </button>
              <button class="ghost" @click="applySample">
                {{ t(uiLang, 'sample') }}
              </button>
              <button class="ghost" @click="clearText">
                {{ t(uiLang, 'clear') }}
              </button>
            </div>
          </div>
          <textarea
            v-model="text"
            class="input"
            :placeholder="t(uiLang, 'inputPlaceholder')"
            spellcheck="false"
          ></textarea>
          <input
            ref="fileInput"
            type="file"
            accept=".lrc,.ass,.ssa,.srt,.txt,text/plain,text/x-ssa"
            class="hidden-file"
            @change="onFileChange"
          />
          <p v-if="autoDetected && text.trim()" class="detect-badge">
            ✓ {{ t(uiLang, 'detectHint') }}
          </p>
        </section>

        <section class="panel result-panel">
          <div class="panel-head">
            <label>{{ t(uiLang, 'countTarget') }}</label>
            <div class="lang-dropdown">
              <div v-if="langOpen" class="lang-backdrop" @click="langOpen = false"></div>
              <button class="lang-trigger" @click="langOpen = !langOpen">
                <template v-if="!LANGUAGES[countLang].group">
                  <img v-if="flagFor(countLang)" class="flag" :src="flagFor(countLang)" alt="" />
                  <span v-else class="flag">{{ flagCss(countLang) }}</span>
                </template>
                <span class="lang-name">{{ langName(countLang) }}</span>
                <span class="caret">▾</span>
              </button>
              <transition name="drop">
                <div v-if="langOpen" class="lang-menu">
                  <input
                    v-model="langSearch"
                    class="lang-search"
                    :placeholder="t(uiLang, 'searchLang')"
                    @keydown.stop
                  />
                  <div class="lang-options">
                    <template v-for="sec in langSections" :key="sec.code + (sec.type === 'group' ? '-g' : '')">
                      <div v-if="sec.type === 'group'" class="lang-group-head">
                        <img class="flag" :src="flagFor(sec.code)" alt="" />
                        <span>{{ groupLabel(sec.code) }}</span>
                      </div>
                      <button
                        v-for="l in sec.children || [sec.lang]"
                        :key="l.code"
                        class="lang-opt"
                        :class="{ active: countLang === l.code, indented: sec.type === 'group' }"
                        @click="selectLang(l.code)"
                      >
                        <template v-if="sec.type !== 'group'">
                          <img v-if="flagFor(l.code)" class="flag" :src="flagFor(l.code)" alt="" />
                          <span v-else class="flag">{{ flagCss(l.code) }}</span>
                        </template>
                        <span class="lang-name">{{ langName(l.code) }}</span>
                        <span class="lang-code">{{ l.code.toUpperCase() }}</span>
                      </button>
                    </template>
                    <div v-if="!langSections.length" class="lang-none">
                      {{ t(uiLang, 'noResult') }}
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <div class="summary">
            <span>{{ visibleLines.length }} {{ t(uiLang, 'statLines') }}</span>
            <span class="dot">·</span>
            <span>{{ t(uiLang, 'statTotal') }} {{ analysis.total }} {{ analysis.unit }}</span>
            <span v-if="countLang === 'ja'" class="mode-chip" :class="readingMode">
              {{ readingMode === 'online' ? t(uiLang,'readingOnline') : t(uiLang,'readingEstimate') }}
            </span>
            <button class="ghost copy-btn" @click="copyResult">
              ⧉ {{ t(uiLang, 'copy') }}
            </button>
          </div>

          <div v-if="loading" class="loading-row">
            <span class="spinner"></span>{{ t(uiLang, 'loadingRead') }}
          </div>
          <p v-else-if="countLang === 'ja' && readingMode === 'estimate' && text.trim()" class="offline-notice">
            ⚠ {{ t(uiLang, 'offlineNotice') }}
          </p>

          <label v-if="countLang === 'ja'" class="toggle-row">
            <input type="checkbox" v-model="kanjiMora" :true-value="2" :false-value="1" />
            <span>{{ t(uiLang, 'kanjiMoraLabel') }}</span>
          </label>

          <label v-if="countLang !== 'ja'" class="toggle-row">
            <input type="checkbox" v-model="dictFallback" />
            <span>{{ t(uiLang, 'dictFallback') }}</span>
          </label>
          <p v-if="dictLoading" class="dict-status">
            <span class="spinner"></span>{{ t(uiLang, 'dictLookup') }}
          </p>
          <p v-else-if="dictActive > 0" class="dict-status ok">
            ✓ {{ t(uiLang, 'dictActive').replace('{n}', dictActive) }}
          </p>
          <p v-else-if="dictError" class="dict-status warn">
            ⚠ {{ t(uiLang, 'importHint') }}
          </p>

          <div v-if="visibleLines.length" class="line-list">
            <div v-for="line in visibleLines" :key="line.idx" class="line-card">
              <div class="line-count">
                <b>{{ line.total }}</b>
                <span>{{ analysis.unit }}</span>
              </div>
              <div class="line-body">
                <div class="line-text">
                  <span
                    v-for="(c, i) in line.chars"
                    :key="i"
                    class="cc"
                    :class="'t-' + c.type"
                  >
                    <template v-if="c.type === 'kanji'">
                      <b>{{ c.ch }}</b>
                      <i v-if="c.reading" class="reading">{{ c.reading }}</i>
                      <sup>{{ c.mora }}</sup>
                    </template>
                    <template v-else>
                      <b>{{ c.ch }}</b>
                      <sup v-if="c.mora > 0">{{ c.mora }}</sup>
                      <sup v-else-if="c.type === 'small'" class="zero">0</sup>
                      <i v-if="c.fromDict" class="dict-tag">{{ t(uiLang, 'dictBadge') }}</i>
                    </template>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="empty-hint">{{ t(uiLang, 'resultEmpty') }}</p>

          <p class="desc">{{ LANGUAGES[countLang].description }}</p>
        </section>
      </template>

      <CompareView v-else :ui-lang="uiLang" />
    </main>

    <footer class="note">
      {{ t(uiLang, 'importHint') }} · {{ t(uiLang, 'about') }}
    </footer>

    <transition name="fade">
      <div v-if="toastVisible" class="toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<style>
@import './style.css';
</style>
