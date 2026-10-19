"use client";

import { XMarkdown } from "@ant-design/x-markdown";
import { GLOSSARY_TAG } from "@/lib/glossary-match";
import { useGlossary } from "./glossary/GlossaryContext";
import GlossaryTerm from "./glossary/GlossaryTerm";

// 放在组件外，避免每次渲染生成新对象导致整段重新挂载
const components = { [GLOSSARY_TAG]: GlossaryTerm };

export default function AnswerContent({ content, streaming }: { content: string; streaming: boolean }) {
  const { markedConfig } = useGlossary();
  return (
    <XMarkdown
      className="answer-markdown"
      content={content}
      config={markedConfig}
      components={components}
      openLinksInNewTab
      streaming={{ hasNextChunk: streaming, tail: streaming }}
    />
  );
}
