import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Mention from '@tiptap/extension-mention'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import './App.css'

const defaultMentionUsers = [
  "Honza",
  "Jirka",
  "Karel"
]

const parseKeywords = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const MentionList = forwardRef(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  const selectItem = (index) => {
    const item = items[index]

    if (item) {
      command({ id: item, label: item })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) {
        return false
      }

      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  if (!items.length) {
    return <div className="mention-empty">No matches</div>
  }

  return (
    <div className="mention-list">
      {items.map((item, index) => (
        <button
          className={index === selectedIndex ? 'mention-item is-active' : 'mention-item'}
          key={item}
          onClick={() => selectItem(index)}
          type="button"
        >
          @{item}
        </button>
      ))}
    </div>
  )
})

MentionList.displayName = 'MentionList'

function App() {
  const [keywordsInput, setKeywordsInput] = useState(defaultMentionUsers.join(', '))
  const mentionUsersRef = useRef(defaultMentionUsers)

  const mentionSuggestion = useMemo(
    () => ({
      items: ({ query }) => {
        const mentionUsers = mentionUsersRef.current
        const defaultItems = mentionUsers.slice(0, 6)
        const normalized = (query ?? '')
          .trim()
          .replace(/^@+/, '')
          .toLowerCase()

        if (!normalized) {
          return defaultItems
        }

        const matches = mentionUsers
          .filter((item) => item.toLowerCase().includes(normalized))
          .slice(0, 6)

        return matches.length ? matches : defaultItems
      },
      render: () => {
        let component
        let popup

        const getPopupInstance = () => popup?.[0]

        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionList, {
              props,
              editor: props.editor,
            })

            if (!props.clientRect) {
              return
            }

            popup = tippy(document.body, {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
            })
          },
          onUpdate(props) {
            component?.updateProps(props)

            if (!props.clientRect) {
              return
            }

            const popupInstance = getPopupInstance()

            if (!popupInstance) {
              popup = tippy(document.body, {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })
              return
            }

            popupInstance.setProps({
              getReferenceClientRect: props.clientRect,
            })
          },
          onKeyDown(props) {
            const popupInstance = getPopupInstance()

            if (props.event.key === 'Escape') {
              popupInstance?.hide()
              return true
            }

            return component.ref?.onKeyDown(props)
          },
          onExit() {
            getPopupInstance()?.destroy()
            component?.destroy()
            popup = undefined
            component = undefined
          },
        }
      },
    }),
    [],
  )

  const handleKeywordsChange = (event) => {
    const value = event.target.value
    setKeywordsInput(value)
    mentionUsersRef.current = parseKeywords(value)
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: mentionSuggestion,
      }),
    ],
    content:
      '<p>Test</p>',
  })

  if (!editor) {
    return null
  }

  return (
    <main className="page">
      <section className="editor-shell">

        <div className="toolbar" role="toolbar" aria-label="Text formatting controls">
          <button
            className={editor.isActive('bold') ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleBold().run()}
            type="button"
          >
            Bold
          </button>
          <button
            className={editor.isActive('italic') ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            type="button"
          >
            Italic
          </button>
          <button
            className={editor.isActive('underline') ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            type="button"
          >
            Underline
          </button>
          <button
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            type="button"
          >
            Bullets
          </button>
          <button
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            type="button"
          >
            Numbered
          </button>
          <button onClick={() => editor.chain().focus().undo().run()} type="button">
            Undo
          </button>
          <button onClick={() => editor.chain().focus().redo().run()} type="button">
            Redo
          </button>
          <button onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} type="button">
            Clear
          </button>
        </div>

        <EditorContent editor={editor} className="editor-area" />

        <div className="keywords-controls">
          <input
            id="mention-keywords"
            onChange={handleKeywordsChange}
            placeholder="Alex, Casey, Maya"
            type="text"
            value={keywordsInput}
          />
        </div>
      </section>
    </main>
  )
}

export default App
