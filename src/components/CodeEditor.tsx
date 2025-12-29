import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'python' | 'javascript';
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = 'python',
  readOnly = false
}: CodeEditorProps) {
  return (
    <div className="flex-1">
      <AceEditor
        mode={language}
        theme="monokai"
        value={value}
        onChange={onChange}
        name="code-editor"
        width="100%"
        height="100%"
        fontSize={14}
        showPrintMargin={false}
        showGutter={true}
        highlightActiveLine={true}
        readOnly={readOnly}
        setOptions={{
          enableBasicAutocompletion: true,
          enableLiveAutocompletion: true,
          enableSnippets: true,
          showLineNumbers: true,
          tabSize: 4,
          useWorker: false
        }}
      />
    </div>
  );
}
