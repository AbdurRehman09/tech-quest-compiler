"use client";
import React, { useRef, useState } from "react";
import { ModeToggleBtn } from "./mode-toggle-btn";
import SelectLanguages, {
  selectedLanguageOptionProps,
} from "./SelectLanguages";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import { Loader, Play, TriangleAlert } from "lucide-react";
import { codeSnippets, languageOptions } from "@/config/config";
import { compileCode } from "@/actions/compile";
import toast from "react-hot-toast";
export interface CodeSnippetsProps {
  [key: string]: string;
}
export default function EditorComponent() {
  const { theme } = useTheme();
  const [sourceCode, setSourceCode] = useState(codeSnippets["javascript"]);
  const [languageOption, setLanguageOption] = useState(languageOptions[0]);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState([]);
  const [err, setErr] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const consoleInputRef = useRef<HTMLInputElement>(null);
  const [inputBuffer, setInputBuffer] = useState<string[]>([]);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);
  const [originalCode, setOriginalCode] = useState("");
  const [executionStep, setExecutionStep] = useState(0);
  // const language = languageOption.language;
  // console.log(language);
  const editorRef = useRef(null);
  // console.log(sourceCode);
  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;
    editor.focus();
  }
  function handleOnchange(value: string | undefined) {
    if (value) {
      setSourceCode(value);
    }
  }
  function onSelect(value: selectedLanguageOptionProps) {
    setLanguageOption(value);
    setSourceCode(codeSnippets[value.language]);
  }

  function processOutput(output: string, isFirstExecution: boolean = false) {
    const lines = output.split('\n');
    let newConsoleOutput: string[] = [];

    if (!isFirstExecution) {
      newConsoleOutput = [...consoleOutput];
    }

    // Find the next cin position in output
    let showUntilIndex = lines.length;
    for (let i = 0; i < lines.length; i++) {
      // Look for compilation errors
      if (lines[i].includes("error:")) {
        showUntilIndex = lines.length; // Show all lines if there's an error
        break;
      }
      // Look for input prompt
      if (lines[i].includes("Enter") && i < lines.length - 1) {
        showUntilIndex = i + 1;
        break;
      }
    }

    // Add lines until the next input prompt
    for (let i = 0; i < showUntilIndex; i++) {
      if (lines[i].trim()) {
        newConsoleOutput.push(lines[i]);
      }
    }

    setConsoleOutput(newConsoleOutput);
    // Set waiting for input if we found an input prompt
    setIsWaitingForInput(lines.some(line => line.includes("Enter")));
  }

  async function handleConsoleInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && consoleInputRef.current) {
      const input = consoleInputRef.current.value;

      // Add input to console with proper formatting
      setConsoleOutput(prev => [...prev, input]);

      const newInputBuffer = [...inputBuffer, input];
      setInputBuffer(newInputBuffer);

      const newRequestData = {
        language: languageOption.language,
        version: languageOption.version,
        files: [
          {
            content: sourceCode,
          },
        ],
        stdin: newInputBuffer.join('\n'),
        compile_timeout: 10000,
        run_timeout: 3000,
        compile_memory_limit: -1,
        run_memory_limit: -1
      };

      try {
        const result = await compileCode(newRequestData);
        if (result.run && result.run.output) {
          processOutput(result.run.output);
        } else if (result.compile && result.compile.output) {
          // Handle compilation errors
          setConsoleOutput([result.compile.output]);
          setIsWaitingForInput(false);
        }
      } catch (error) {
        setErr(true);
        console.error(error);
        setConsoleOutput(prev => [...prev, "Error executing code"]);
        setIsWaitingForInput(false);
      }

      consoleInputRef.current.value = '';
    }
  }

  async function executeCode() {
    setLoading(true);
    setConsoleOutput([]);
    setInputBuffer([]);
    setCurrentInputIndex(0);
    setErr(false);

    const requestData = {
      language: languageOption.language,
      version: languageOption.version,
      files: [
        {
          content: sourceCode,
        },
      ],
      stdin: "",
      compile_timeout: 10000,
      run_timeout: 3000,
      compile_memory_limit: -1,
      run_memory_limit: -1
    };

    try {
      const result = await compileCode(requestData);
      if (result.run && result.run.output) {
        processOutput(result.run.output, true);
        setErr(false);
      } else if (result.compile && result.compile.output) {
        // Handle compilation errors
        setConsoleOutput([result.compile.output]);
        setIsWaitingForInput(false);
        setErr(true);
      }
      setLoading(false);
    } catch (error) {
      setErr(true);
      setLoading(false);
      setConsoleOutput(["Error executing code"]);
      console.error(error);
    }
  }

  // console.log(languageOption);
  return (
    <div className="min-h-screen dark:bg-slate-900 rounded-2xl shadow-2xl py-6 px-8">
      {/* EDITOR HEADER */}
      <div className="flex items-center justify-between pb-3">
        <h2 className="scroll-m-20  text-2xl font-semibold tracking-tight first:mt-0">
          Codex
        </h2>
        <div className="flex items-center space-x-2 ">
          <ModeToggleBtn />
          <div className="w-[230px]">
            <SelectLanguages
              onSelect={onSelect}
              selectedLanguageOption={languageOption}
            />
          </div>
        </div>
      </div>
      {/* EDITOR  */}
      <div className="bg-slate-400 dark:bg-slate-950 p-3 rounded-2xl">
        <ResizablePanelGroup
          direction="horizontal"
          className="w-full rounded-lg border dark:bg-slate-900"
        >
          <ResizablePanel defaultSize={50} minSize={35}>
            <Editor
              theme={theme === "dark" ? "vs-dark" : "vs-light"}
              height="100vh"
              defaultLanguage={languageOption.language}
              defaultValue={sourceCode}
              onMount={handleEditorDidMount}
              value={sourceCode}
              onChange={handleOnchange}
              language={languageOption.language}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={35}>
            {/* Header */}
            <div className="space-y-3 bg-slate-300 dark:bg-slate-900 min-h-screen">
              <div className="flex items-center justify-between  bg-slate-400 dark:bg-slate-950 px-6 py-2">
                <h2>Console</h2>
                <Button
                  onClick={executeCode}
                  size={"sm"}
                  disabled={loading}
                  className="dark:bg-purple-600 dark:hover:bg-purple-700 text-slate-100 bg-slate-800 hover:bg-slate-900"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      <span>Run</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="px-6 space-y-2 font-mono text-sm h-[calc(100vh-200px)] overflow-y-auto">
                {/* Console Output */}
                {consoleOutput.map((line, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {line}
                  </div>
                ))}

                {/* Interactive Input Line */}
                {isWaitingForInput && (
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">{'>'}</span>
                    <input
                      ref={consoleInputRef}
                      type="text"
                      className="flex-1 bg-transparent border-none outline-none"
                      onKeyDown={handleConsoleInput}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Body */}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
