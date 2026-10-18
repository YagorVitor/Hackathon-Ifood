export interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
export interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
export interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
export type RecognitionConstructor = new () => Recognition
export function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const browser = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition
}
export function appendTranscript(original: string, transcript: string, limit: number): string {
  return [original.trimEnd(), transcript.trim()].filter(Boolean).join(' ').slice(0, limit)
}
export function finalTranscripts(event: RecognitionEvent, committed: Set<number>): string {
  const words: string[] = []
  for (let index = event.resultIndex; index < event.results.length; index++) {
    const result = event.results[index]
    if (result.isFinal && !committed.has(index)) { committed.add(index); words.push(result[0].transcript) }
  }
  return words.join(' ').trim()
}
export function speechChunks(text: string, length = 240): string[] {
  const words = text.replace(/[*#`]/g, '').trim().slice(0, 12000).split(/\s+/)
  const chunks: string[] = []
  for (const word of words) {
    if (!word) continue
    const last = chunks.length - 1
    if (last >= 0 && chunks[last].length + word.length + 1 <= length) chunks[last] += ` ${word}`
    else if (word.length <= length) chunks.push(word)
    else for (let start = 0; start < word.length; start += length) chunks.push(word.slice(start, start + length))
  }
  return chunks
}
