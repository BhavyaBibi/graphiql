import { useContext, useEffect, useRef } from 'react';

import { StorageContext } from '../storage';
import { commonKeys, importCodeMirror } from './common';
import { EditorContext } from './context';
import {
  EditCallback,
  EmptyCallback,
  useChangeHandler,
  useCompletion,
  useKeyMap,
  useResizeEditor,
  useSynchronizeValue,
} from './hooks';

export type UseHeaderEditorArgs = {
  editorTheme?: string;
  onEdit?: EditCallback;
  onRunQuery?: EmptyCallback;
  readOnly?: boolean;
  shouldPersistHeaders?: boolean;
  value?: string;
};

export function useHeaderEditor({
  editorTheme = 'graphiql',
  onEdit,
  onRunQuery,
  readOnly = false,
  shouldPersistHeaders = false,
  value,
}: UseHeaderEditorArgs = {}) {
  const context = useContext(EditorContext);
  const storage = useContext(StorageContext);
  const ref = useRef<HTMLDivElement>(null);

  if (!context) {
    throw new Error(
      'Tried to call the `useHeaderEditor` hook without the necessary context. Make sure that the `EditorContextProvider` from `@graphiql/react` is rendered higher in the tree.',
    );
  }

  const { headerEditor, setHeaderEditor } = context;

  const initialValue = useRef(value ?? storage?.get(STORAGE_KEY) ?? '');

  useEffect(() => {
    let isActive = true;

    importCodeMirror([
      // @ts-expect-error
      import('codemirror/mode/javascript/javascript'),
    ]).then(CodeMirror => {
      // Don't continue if the effect has already been cleaned up
      if (!isActive) {
        return;
      }

      const container = ref.current;
      if (!container) {
        return;
      }

      const newEditor = CodeMirror(container, {
        value: initialValue.current || '',
        lineNumbers: true,
        tabSize: 2,
        mode: { name: 'javascript', json: true },
        theme: editorTheme,
        keyMap: 'sublime',
        autoCloseBrackets: true,
        matchBrackets: true,
        showCursorWhenSelecting: true,
        readOnly: readOnly ? 'nocursor' : false,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        extraKeys: commonKeys,
      });

      newEditor.addKeyMap({
        'Cmd-Space'() {
          newEditor.showHint({ completeSingle: false, container });
        },
        'Ctrl-Space'() {
          newEditor.showHint({ completeSingle: false, container });
        },
        'Alt-Space'() {
          newEditor.showHint({ completeSingle: false, container });
        },
        'Shift-Space'() {
          newEditor.showHint({ completeSingle: false, container });
        },
      });

      newEditor.on('keyup', (editorInstance, event) => {
        const code = event.keyCode;
        if (
          (code >= 65 && code <= 90) || // letters
          (!event.shiftKey && code >= 48 && code <= 57) || // numbers
          (event.shiftKey && code === 189) || // underscore
          (event.shiftKey && code === 222) // "
        ) {
          editorInstance.execCommand('autocomplete');
        }
      });

      setHeaderEditor(newEditor);
    });

    return () => {
      isActive = false;
    };
  }, [editorTheme, readOnly, setHeaderEditor]);

  useSynchronizeValue(headerEditor, value);

  useChangeHandler(
    headerEditor,
    onEdit,
    shouldPersistHeaders ? STORAGE_KEY : null,
  );

  useCompletion(headerEditor);

  useKeyMap(headerEditor, ['Cmd-Enter', 'Ctrl-Enter'], onRunQuery);
  useKeyMap(headerEditor, ['Shift-Ctrl-P'], context.prettify);
  useKeyMap(headerEditor, ['Shift-Ctrl-M'], context.merge);

  useResizeEditor(headerEditor, ref);

  return ref;
}

const STORAGE_KEY = 'headers';
