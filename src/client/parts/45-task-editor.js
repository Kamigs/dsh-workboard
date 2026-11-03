/**
 * Task editor dialog: create and edit task details, upload attachments,
 * manage tags, pick the assignee kind, validate inline and surface host errors.
 */
addDict(
  {
    'editor.newTitle': '新建任务',
    'editor.editTitle': '编辑任务',
    'editor.content': '任务内容',
    'editor.contentPlaceholder': '第一行概括任务，后面可补充背景和验收标准。',
    'editor.startDate': '开始日期',
    'editor.dueDate': '截止日期',
    'editor.priority': '紧急程度',
    'editor.tags': '标签',
    'editor.tagPlaceholder': '输入标签后按回车',
    'editor.tagRemove': '移除标签 {tag}',
    'editor.tagLimit': '最多添加 12 个标签',
    'editor.attachments': '附件',
    'editor.addAttachment': '点击或拖入文件添加附件',
    'editor.dropFolders': '文件夹无法直接添加，请拖入其中的文件',
    'editor.removeAttachment': '移除附件 {name}',
    'editor.assignee': '负责人',
    'editor.assigneeAi': 'AI',
    'editor.assigneeHuman': '人工',
    'editor.contentRequired': '请输入任务内容',
    'editor.contentLimit': '任务正文最多支持 20000 个字符。',
    'editor.dateOrder': '截止日期不能早于开始日期',
    'editor.noWorkspace': '请先选择项目',
    'editor.deleteConfirm': '再次点击删除',
    'editor.saved': '任务已保存',
    'editor.deleted': '任务已删除',
  },
  {
    'editor.newTitle': 'New task',
    'editor.editTitle': 'Edit task',
    'editor.content': 'Task content',
    'editor.contentPlaceholder': 'Summarize the task on the first line. Add details below.',
    'editor.startDate': 'Start date',
    'editor.dueDate': 'Due date',
    'editor.priority': 'Priority',
    'editor.tags': 'Tags',
    'editor.tagPlaceholder': 'Type a tag and press Enter',
    'editor.tagRemove': 'Remove tag {tag}',
    'editor.tagLimit': 'Up to 12 tags',
    'editor.attachments': 'Attachments',
    'editor.addAttachment': 'Click or drop files to attach',
    'editor.dropFolders': 'To attach a folder’s contents, drop the files inside it.',
    'editor.removeAttachment': 'Remove attachment {name}',
    'editor.assignee': 'Assignee',
    'editor.assigneeAi': 'AI',
    'editor.assigneeHuman': 'Human',
    'editor.contentRequired': 'Enter the task content',
    'editor.contentLimit': 'The task body supports up to 20,000 characters.',
    'editor.dateOrder': "Due date can't be before the start date",
    'editor.noWorkspace': 'Choose a project first',
    'editor.deleteConfirm': 'Click again to delete',
    'editor.saved': 'Task saved',
    'editor.deleted': 'Task deleted',
  },
)

const KBN_MAX_TAGS = 12
const KBN_MAX_TAG_LENGTH = 32

/**
 * Normalize a tag list to what the host accepts: strings only, trimmed,
 * non-empty, deduplicated and capped at 12 items.
 * @param {any} input
 * @returns {string[]}
 */
function kbnCleanTags(input) {
  const result = []
  if (!Array.isArray(input)) return result
  for (const value of input) {
    if (typeof value !== 'string') continue
    const tag = value.trim().slice(0, KBN_MAX_TAG_LENGTH)
    if (tag === '' || result.indexOf(tag) >= 0) continue
    result.push(tag)
    if (result.length >= KBN_MAX_TAGS) break
  }
  return result
}

function taskContentTitle(text) {
  const newline = text.indexOf('\n')
  const first = (newline < 0 ? text : text.slice(0, newline)).trim()
  // Avoid cutting a surrogate pair at the host's 200-character title limit.
  if (first.length <= 200) return first
  return first.slice(0, 199).replace(/[\uD800-\uDBFF]$/, '') + '…'
}

// Store the body separately when it round-trips through the legacy fields.
// Otherwise keep the full input, including paragraph breaks and code indentation.
function taskContentFields(value) {
  const text = value.trim()
  const title = taskContentTitle(text)
  if (text === title) return { title, description: '' }
  const body = text.slice(text.indexOf('\n') + 1).trim()
  const fields = { title, description: body }
  if (taskContentText(fields) === text) return fields
  return { title, description: text }
}

function taskContentText({ title, description }) {
  if (!description) return title
  if (taskContentTitle(description) === title) return description
  return title + '\n' + description
}

/**
 * Create/edit task dialog.
 * @param {{ open: boolean, mode: 'create' | 'edit', task?: object | null, workspaceId?: string | null, columnStatus?: string, onClose: Function, onSaved?: Function }} props
 * @returns {object} React element
 */
function TaskEditorDialog({ open, mode, task, workspaceId, columnStatus, sessionId, onClose, onSaved }) {
  const isEdit = mode === 'edit' && task !== null && task !== undefined
  const [content, setContent] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [tags, setTags] = useState([])
  const [tagDraft, setTagDraft] = useState('')
  const [attachments, setAttachments] = useState([])
  const [assigneeKind, setAssigneeKind] = useState('human')
  const account = useKbnAccount()
  const [assigneeName, setAssigneeName] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef(null)
  const dropZoneRef = useRef(null)
  const uploadBatchRef = useRef(null)
  const tagInputRef = useRef(null)

  // A human assignee is the signed-in account: read its profile for the card.
  useEffect(() => {
    if (!open || assigneeKind !== 'human') return
    if (kanbanStore !== null) loadKbnAccount(kanbanStore.ctx)
  }, [open, assigneeKind])

  // Reopening (or switching to another task) always starts from the stored task.
  useEffect(() => {
    if (!open) return
    const source = task !== null && task !== undefined ? task : null
    setContent(source ? taskContentText(source) : '')
    setStartDate(source !== null && typeof source.startDate === 'string' ? source.startDate : '')
    setDueDate(source !== null && typeof source.dueDate === 'string' ? source.dueDate : '')
    setPriority(source !== null && PRIORITIES.indexOf(source.priority) >= 0 ? source.priority : 'medium')
    setTags(kbnCleanTags(source !== null && Array.isArray(source.tags) ? source.tags : []))
    setAttachments(source !== null && Array.isArray(source.attachments) ? source.attachments.slice() : [])
    setAssigneeKind(source !== null && source.assignee !== null && source.assignee !== undefined
      && source.assignee.kind === 'ai' ? 'ai' : 'human')
    setAssigneeName(source !== null && source.assignee !== null && source.assignee !== undefined
      && typeof source.assignee.name === 'string' ? source.assignee.name : '')
    setTagDraft('')
    setErrors({})
    setFormError(null)
    setSaving(false)
    setUploading(false)
    setDragActive(false)
    setConfirmDelete(false)
    return () => { uploadBatchRef.current = null }
  }, [open, mode, task === null || task === undefined ? null : task.id])

  function addTag() {
    const value = tagDraft.trim()
    if (value === '') return
    setTagDraft('')
    if (tags.indexOf(value.slice(0, KBN_MAX_TAG_LENGTH)) >= 0) return
    if (tags.length >= KBN_MAX_TAGS) {
      setFormError(t('editor.tagLimit'))
      return
    }
    setTags(kbnCleanTags(tags.concat([value])))
  }

  function handleTagKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addTag()
      return
    }
    if (event.key === 'Backspace' && tagDraft === '' && tags.length > 0) {
      setTags(tags.slice(0, tags.length - 1))
    }
  }

  function removeTag(index) {
    setTags(tags.filter((tag, position) => position !== index))
  }

  function removeAttachment(index) {
    setAttachments(attachments.filter((attachment, position) => position !== index))
  }

  async function addFiles(picked, message = null) {
    if (saving || uploadBatchRef.current) return
    setFormError(message)
    if (!picked.length) return
    uploadBatchRef.current = picked
    const next = attachments.slice()
    setUploading(true)
    try {
      for (const file of picked) {
        try {
          const attachment = await kanbanStore.uploadAttachment(file, workspaceId)
          if (uploadBatchRef.current !== picked) return
          next.push(attachment)
          setAttachments(next.slice())
        } catch (error) {
          if (uploadBatchRef.current !== picked) return
          message = messageOf(error)
        }
      }
    } finally {
      if (uploadBatchRef.current === picked) {
        uploadBatchRef.current = null
        setUploading(false)
        setFormError(message)
      }
    }
  }

  function handleFileDrag(event) {
    const transfer = event.dataTransfer
    if (!transfer.types.includes('Files')) return
    // DSH also handles file drops on the document for conversation attachments.
    event.preventDefault()
    event.stopPropagation()
    const zone = dropZoneRef.current
    if (event.type === 'dragleave') {
      if (!zone?.contains(event.relatedTarget)) setDragActive(false)
      return
    }
    const inside = zone?.contains(event.target)
    const available = inside && !uploading && !saving
    transfer.dropEffect = available ? 'copy' : 'none'
    setDragActive(available && event.type !== 'drop')
    if (event.type !== 'drop' || !inside || uploading || saving) return
    const files = Array.from(transfer.files)
    const items = Array.from(transfer.items).filter((item) => item.kind === 'file')
    const picked = files.filter((file, i) => !items[i]?.webkitGetAsEntry?.()?.isDirectory)
    return addFiles(picked, picked.length < files.length ? t('editor.dropFolders') : null)
  }

  function validate() {
    const nextErrors = {}
    if (!content.trim()) nextErrors.content = t('editor.contentRequired')
    if ((!isEdit || content !== taskContentText(task)) && taskContentFields(content).description.length > 20000) {
      nextErrors.content = t('editor.contentLimit')
    }
    if (startDate !== '' && dueDate !== '' && dueDate < startDate) nextErrors.dueDate = t('editor.dateOrder')
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    if (!isEdit && (typeof workspaceId !== 'string' || workspaceId === '')) {
      setFormError(t('editor.noWorkspace'))
      return
    }
    const payload = {
      ...(isEdit && content === taskContentText(task) ? {} : taskContentFields(content)),
      startDate: startDate === '' ? null : startDate,
      dueDate: dueDate === '' ? null : dueDate,
      priority,
      tags: kbnCleanTags(tags),
      attachments: attachments.slice(),
      assignee: {
        kind: assigneeKind,
        name: assigneeKind === 'human'
          ? (account.profile !== null && account.profile.name !== null
            ? account.profile.name
            : assigneeName.trim())
          : '',
      },
    }
    setSaving(true)
    setFormError(null)
    try {
      const saved = isEdit
        ? await kanbanStore.updateTask(task.id, payload)
        : await kanbanStore.createTask(workspaceId, { ...payload, status: columnStatus, sessionId })
      kanbanStore.toast(t('editor.saved'), 'info')
      if (typeof onSaved === 'function') onSaved(saved)
      if (typeof onClose === 'function') onClose()
    } catch (error) {
      setFormError(messageOf(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!isEdit) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await kanbanStore.deleteTask(task.id)
      kanbanStore.toast(t('editor.deleted'), 'info')
      if (typeof onClose === 'function') onClose()
    } catch (error) {
      setFormError(messageOf(error))
    } finally {
      setSaving(false)
    }
  }

  const priorityOptions = PRIORITIES.map((value) => ({ value, label: t('priority.' + value) }))

  const footer = h(Fragment, null,
    h(Button, {
      key: 'cancel',
      variant: 'ghost',
      disabled: saving,
      onClick: onClose,
    }, t('common.cancel')),
    isEdit
      ? h(Button, {
        key: 'delete',
        variant: 'danger',
        icon: h(Icon, { name: 'trash', size: 14 }),
        disabled: saving,
        onClick: handleDelete,
      }, confirmDelete ? t('editor.deleteConfirm') : t('common.delete'))
      : null,
    h(Button, {
      key: 'save',
      variant: 'primary',
      icon: h(Icon, { name: 'check', size: 14 }),
      busy: saving,
      disabled: uploading,
      onClick: handleSave,
    }, t('common.save')))

  return h(Modal, {
    open,
    onClose,
    title: isEdit ? t('editor.editTitle') : t('editor.newTitle'),
    onFileDrag: handleFileDrag,
    icon: isEdit ? h(Icon, { name: 'board', size: 16 }) : null,
    width: 560,
    busy: saving,
    footer,
  },
    h('div', { className: 'kbn-editor' },
      formError !== null ? h('p', { className: 'kbn-editor-error', role: 'alert' }, formError) : null,

      h(Field, { label: t('editor.content'), required: true, error: errors.content },
        h(TextArea, {
          value: content,
          onChange: (value) => {
            setContent(kbnFieldValue(value))
            if (errors.content) setErrors(Object.assign({}, errors, { content: undefined }))
          },
          rows: 4,
          placeholder: t('editor.contentPlaceholder'),
          ariaLabel: t('editor.content'),
        })),

      h('div', { className: 'kbn-form-grid' },
        h('div', { className: 'kbn-form-row' },
          h(Field, { label: t('editor.priority') },
            h(Select, {
              value: priority,
              onChange: (value) => setPriority(kbnFieldValue(value)),
              options: priorityOptions,
              ariaLabel: t('editor.priority'),
            }))),
        h('div', { className: 'kbn-form-row' },
          h(Field, { label: t('editor.tags') },
            h('div', {
              className: 'kbn-tag-input',
              onClick: () => {
                if (tagInputRef.current !== null) tagInputRef.current.focus()
              },
            },
              tags.map((tag, index) => h('span', { className: 'kbn-tag-pill', key: tag + ':' + index },
                h('span', { title: tag }, tag),
                h('button', {
                  type: 'button',
                  className: 'kbn-tag-x',
                  'aria-label': t('editor.tagRemove', { tag }),
                  title: t('editor.tagRemove', { tag }),
                  onClick: (event) => {
                    if (event !== null && event !== undefined) event.stopPropagation()
                    removeTag(index)
                  },
                }, h(Icon, { name: 'close', size: 12 })))),
              h('input', {
                ref: tagInputRef,
                className: 'kbn-tag-field',
                value: tagDraft,
                placeholder: tags.length === 0 ? t('editor.tagPlaceholder') : '',
                'aria-label': t('editor.tags'),
                onChange: (event) => setTagDraft(event.target.value),
                onKeyDown: handleTagKeyDown,
                maxLength: KBN_MAX_TAG_LENGTH,
              })))),
        h('div', { className: 'kbn-form-row' },
          h(Field, { label: t('editor.startDate') },
            h(DateField, {
              value: startDate,
              onChange: (value) => setStartDate(kbnFieldValue(value)),
              ariaLabel: t('editor.startDate'),
            }))),
        h('div', { className: 'kbn-form-row' },
          h(Field, { label: t('editor.dueDate'), error: errors.dueDate },
            h(DateField, {
              value: dueDate,
              onChange: (value) => {
                setDueDate(kbnFieldValue(value))
                if (errors.dueDate !== undefined) setErrors(Object.assign({}, errors, { dueDate: undefined }))
              },
              ariaLabel: t('editor.dueDate'),
            })))),

      h('div', { className: 'kbn-form-row kbn-assignee-block', 'data-span': 'full' },
        h('div', { className: 'kbn-seg', role: 'group', 'aria-label': t('editor.assignee') },
          h('button', {
            type: 'button',
            className: 'kbn-seg-btn',
            'aria-pressed': assigneeKind === 'ai' ? 'true' : 'false',
            onClick: () => setAssigneeKind('ai'),
          }, h(Icon, { name: 'sparkle', size: 14 }), t('editor.assigneeAi')),
          h('button', {
            type: 'button',
            className: 'kbn-seg-btn',
            'aria-pressed': assigneeKind === 'human' ? 'true' : 'false',
            onClick: () => setAssigneeKind('human'),
          }, h(Icon, { name: 'user', size: 14 }), t('editor.assigneeHuman'))),
        assigneeKind === 'human'
          ? h(AccountAssigneeCard, { profile: account.profile, status: account.status })
          : null),

      h('div', { className: 'kbn-form-row', ref: dropZoneRef, 'data-file-over': dragActive || undefined },
        h(Field, { label: t('editor.attachments') },
          h('div', { className: 'kbn-attach-list' },
            attachments.map((attachment, index) => h('div', {
              className: 'kbn-attach-item',
              key: typeof attachment.id === 'string' ? attachment.id : 'attachment-' + index,
            },
              h(Icon, { name: 'paperclip', size: 14 }),
              h('span', { className: 'kbn-attach-name', title: attachment.name }, attachment.name),
              h('span', { className: 'kbn-attach-size' }, formatBytes(attachment.size)),
              h('button', {
                type: 'button',
                className: 'kbn-attach-x',
                'aria-label': t('editor.removeAttachment', { name: attachment.name }),
                title: t('editor.removeAttachment', { name: attachment.name }),
                disabled: uploading || saving,
                onClick: () => removeAttachment(index),
              }, h(Icon, { name: 'close', size: 12 })))),
            h('input', {
              ref: fileRef,
              type: 'file',
              multiple: true,
              tabIndex: -1,
              'aria-hidden': 'true',
              className: 'kbn-visually-hidden',
              onChange: (event) => {
                const files = Array.from(event.currentTarget.files)
                event.currentTarget.value = ''
                return addFiles(files)
              },
            }),
            h('button', {
              type: 'button',
              className: 'kbn-attach-add',
              disabled: uploading || saving,
              onClick: () => {
                if (fileRef.current !== null) fileRef.current.click()
              },
            },
              h(Icon, { name: uploading ? 'refresh' : 'paperclip', size: 14 }),
              uploading ? t('common.loading') : t('editor.addAttachment')))))),
    )
}
