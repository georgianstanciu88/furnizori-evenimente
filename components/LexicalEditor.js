'use client'
import { useState, useEffect } from 'react'
import { $getRoot, $getSelection } from 'lexical'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $createListNode, $createListItemNode, ListNode, ListItemNode } from '@lexical/list'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { $createLinkNode, LinkNode } from '@lexical/link'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { 
  $getSelection as getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  $createParagraphNode,
  $createTextNode,
  $insertNodes
} from 'lexical'

// Configurația editorului
const theme = {
  text: {
    bold: 'lexical-bold',
    italic: 'lexical-italic',
    underline: 'lexical-underline',
    strikethrough: 'lexical-strikethrough',
    code: 'lexical-code'
  },
  heading: {
    h1: 'lexical-h1',
    h2: 'lexical-h2',
    h3: 'lexical-h3'
  },
  list: {
    nested: {
      listitem: 'lexical-nested-listitem'
    },
    ol: 'lexical-list-ol',
    ul: 'lexical-list-ul',
    listitem: 'lexical-listitem'
  },
  quote: 'lexical-quote',
  link: 'lexical-link',
  paragraph: 'lexical-paragraph'
}

// Plugin pentru toolbar
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)

  const formatText = (format) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
  }

  const formatHeading = (headingSize) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingSize))
      }
    })
  }

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }

  const formatList = (listType) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => {
          const listNode = $createListNode(listType)
          const listItemNode = $createListItemNode()
          listNode.append(listItemNode)
          return listNode
        })
      }
    })
  }

  const formatAlignment = (alignment) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment)
  }

  // Toolbar buttons style
  const buttonStyle = {
    padding: '8px 12px',
    margin: '0 2px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px'
  }

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#eff6ff',
    color: '#2563eb'
  }

  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      flexWrap: 'wrap',
      backgroundColor: '#f9fafb'
    }}>
      {/* Text formatting */}
      <button
        style={isBold ? activeButtonStyle : buttonStyle}
        onClick={() => formatText('bold')}
        title="Bold"
        onMouseOver={(e) => {
          if (!isBold) e.target.style.backgroundColor = '#f3f4f6'
        }}
        onMouseOut={(e) => {
          if (!isBold) e.target.style.backgroundColor = 'transparent'
        }}
      >
        <strong>B</strong>
      </button>
      
      <button
        style={isItalic ? activeButtonStyle : buttonStyle}
        onClick={() => formatText('italic')}
        title="Italic"
        onMouseOver={(e) => {
          if (!isItalic) e.target.style.backgroundColor = '#f3f4f6'
        }}
        onMouseOut={(e) => {
          if (!isItalic) e.target.style.backgroundColor = 'transparent'
        }}
      >
        <em>I</em>
      </button>
      
      <button
        style={isUnderline ? activeButtonStyle : buttonStyle}
        onClick={() => formatText('underline')}
        title="Underline"
        onMouseOver={(e) => {
          if (!isUnderline) e.target.style.backgroundColor = '#f3f4f6'
        }}
        onMouseOut={(e) => {
          if (!isUnderline) e.target.style.backgroundColor = 'transparent'
        }}
      >
        <u>U</u>
      </button>

      {/* Separator */}
      <div style={{
        width: '1px',
        height: '20px',
        backgroundColor: '#e5e7eb',
        margin: '0 8px'
      }}></div>

      {/* Alignment */}
      <button
        style={buttonStyle}
        onClick={() => formatAlignment('left')}
        title="Align Left"
        onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        ⬅
      </button>
      
      <button
        style={buttonStyle}
        onClick={() => formatAlignment('center')}
        title="Align Center"
        onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        ↔
      </button>
      
      <button
        style={buttonStyle}
        onClick={() => formatAlignment('right')}
        title="Align Right"
        onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        ➡
      </button>

      {/* Separator */}
      <div style={{
        width: '1px',
        height: '20px',
        backgroundColor: '#e5e7eb',
        margin: '0 8px'
      }}></div>

      {/* Headings */}
      <button
        style={buttonStyle}
        onClick={() => formatHeading('h1')}
        title="Heading 1"
        onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        H1
      </button>
      
      <button
        style={buttonStyle}
        onClick={() => formatHeading('h2')}
        title="Heading 2"
        onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        H2
      </button>
      
      <button
        style={buttonStyle}
        onClick={() => formatHeading('h3')}
        title="Heading 3"
        onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        H3
      </button>

      {/* Separator */}
      <div style={{
        width: '1px',
        height: '20px',
        backgroundColor: '#e5e7eb',
        margin: '0 8px'
      }}></div>

      {/* Lists */}
      <button
        style={buttonStyle}
        onClick={() => formatList('bullet')}
        title="Bullet List"
        onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        •
      </button>
      
      <button
        style={buttonStyle}
        onClick={() => formatList('number')}
        title="Numbered List"
        onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        1.
      </button>

      {/* Quote */}
      <button
        style={buttonStyle}
        onClick={formatQuote}
        title="Quote"
        onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        "
      </button>
    </div>
  )
}

// Plugin pentru setarea valorii inițiale (HTML sau text)
function InitialValuePlugin({ value }) {
  const [editor] = useLexicalComposerContext()
  
  useEffect(() => {
    if (value && value.trim()) {
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        
        // Dacă valoarea pare să fie HTML (conține tag-uri)
        if (value.includes('<') && value.includes('>')) {
          const parser = new DOMParser()
          const dom = parser.parseFromString(value, 'text/html')
          const nodes = $generateNodesFromDOM(editor, dom)
          root.append(...nodes)
        } else {
          // Pentru text simplu
          const paragraph = $createParagraphNode()
          const textNode = $createTextNode(value)
          paragraph.append(textNode)
          root.append(paragraph)
        }
      })
    }
  }, [editor, value])
  
  return null
}

// Placeholder component
function Placeholder({ children }) {
  return (
    <div style={{
      color: '#9ca3af',
      overflow: 'hidden',
      position: 'absolute',
      textOverflow: 'ellipsis',
      top: '12px',
      left: '16px',
      fontSize: '16px',
      userSelect: 'none',
      display: 'inline-block',
      pointerEvents: 'none'
    }}>
      {children}
    </div>
  )
}

// Componenta principală
export default function LexicalEditor({ value, onChange, placeholder = "Începe să scrii..." }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const initialConfig = {
    namespace: 'LexicalEditor',
    theme,
    onError: (error) => {
      console.error('Lexical error:', error)
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode
    ]
  }

  const handleChange = (editorState, editor) => {
    editorState.read(() => {
      const htmlString = $generateHtmlFromNodes(editor, null)
      if (onChange) {
        onChange(htmlString)
      }
    })
  }

  if (!mounted) {
    return (
      <div style={{
        border: '1px solid #d1d5db',
        borderRadius: '12px',
        padding: '12px 16px',
        minHeight: '120px',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280'
      }}>
        Se încarcă editorul...
      </div>
    )
  }

  return (
    <div style={{
      border: '1px solid #d1d5db',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: 'white'
    }}>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div style={{ position: 'relative' }}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                style={{
                  minHeight: '120px',
                  padding: '12px 16px',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            }
            placeholder={<Placeholder>{placeholder}</Placeholder>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <OnChangePlugin onChange={handleChange} />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <InitialValuePlugin value={value} />
      </LexicalComposer>

      {/* CSS pentru stilizare */}
      <style jsx global>{`
        .lexical-bold {
          font-weight: bold;
        }
        
        .lexical-italic {
          font-style: italic;
        }
        
        .lexical-underline {
          text-decoration: underline;
        }
        
        .lexical-strikethrough {
          text-decoration: line-through;
        }
        
        .lexical-code {
          background-color: #f3f4f6;
          padding: 2px 4px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
        
        .lexical-h1 {
          font-size: 1.5em;
          font-weight: 700;
          margin: 0.5em 0;
          color: #111827;
        }
        
        .lexical-h2 {
          font-size: 1.3em;
          font-weight: 600;
          margin: 0.4em 0;
          color: #111827;
        }
        
        .lexical-h3 {
          font-size: 1.1em;
          font-weight: 600;
          margin: 0.3em 0;
          color: #111827;
        }
        
        .lexical-quote {
          border-left: 4px solid #e5e7eb;
          margin: 1em 0;
          padding-left: 1em;
          color: #6b7280;
          font-style: italic;
        }
        
        .lexical-list-ul,
        .lexical-list-ol {
          margin: 0.5em 0;
          padding-left: 1.5em;
        }
        
        .lexical-listitem {
          margin: 0.2em 0;
        }
        
        .lexical-nested-listitem {
          list-style-type: none;
        }
        
        .lexical-link {
          color: #2563eb;
          text-decoration: underline;
        }
        
        .lexical-link:hover {
          color: #1d4ed8;
        }
        
        .lexical-paragraph {
          margin: 0.5em 0;
        }
        
        /* Alignment classes */
        [data-lexical-editor] p[style*="text-align: center"],
        [data-lexical-editor] h1[style*="text-align: center"],
        [data-lexical-editor] h2[style*="text-align: center"],
        [data-lexical-editor] h3[style*="text-align: center"] {
          text-align: center !important;
        }
        
        [data-lexical-editor] p[style*="text-align: right"],
        [data-lexical-editor] h1[style*="text-align: right"],
        [data-lexical-editor] h2[style*="text-align: right"],
        [data-lexical-editor] h3[style*="text-align: right"] {
          text-align: right !important;
        }
        
        [data-lexical-editor] p[style*="text-align: left"],
        [data-lexical-editor] h1[style*="text-align: left"],
        [data-lexical-editor] h2[style*="text-align: left"],
        [data-lexical-editor] h3[style*="text-align: left"] {
          text-align: left !important;
        }
      `}</style>
    </div>
  )
}
