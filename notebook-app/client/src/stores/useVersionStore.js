import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useVersionStore = defineStore('versions', () => {
  // versions per note: { [noteId]: [{ id, content, type, label, timestamp }] }
  const versionsMap = ref({})
  const currentVersionIndex = ref(-1)

  function getVersions(noteId) {
    return versionsMap.value[noteId] || []
  }

  function initNote(noteId, content) {
    if (versionsMap.value[noteId]?.length) return
    versionsMap.value[noteId] = [{
      id: 'v0',
      content: content || '',
      type: 'original',
      label: '原文',
      timestamp: Date.now(),
    }]
    currentVersionIndex.value = 0
  }

  function addVersion(noteId, content, aiType, label) {
    if (!versionsMap.value[noteId]) versionsMap.value[noteId] = []
    const versions = versionsMap.value[noteId]
    const version = {
      id: `v${versions.length}`,
      content,
      type: 'ai',
      aiType,
      label: label || `AI ${aiType}`,
      timestamp: Date.now(),
    }
    versions.push(version)
    currentVersionIndex.value = versions.length - 1
    return version
  }

  function restoreVersion(noteId, index) {
    const versions = versionsMap.value[noteId]
    if (!versions || index < 0 || index >= versions.length) return null
    currentVersionIndex.value = index
    return versions[index]
  }

  function clearNote(noteId) {
    delete versionsMap.value[noteId]
    currentVersionIndex.value = -1
  }

  const currentVersion = computed(() => {
    const notesStore = versionsMap.value // just for reactivity
    return null
  })

  return {
    versionsMap, currentVersionIndex,
    getVersions, initNote, addVersion, restoreVersion, clearNote,
  }
})
