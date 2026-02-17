interface ArticleInput {
  id: string;
  title: string;
  source: string;
  url: string;
}

export function buildTechPrompt(articles: ArticleInput[]): string {
  const articleList = articles
    .map(
      (a, i) =>
        `[기사 ${i + 1}] id: "${a.id}" / 제목: ${a.title} / 출처: ${a.source} / URL: ${a.url}`
    )
    .join('\n');

  return `아래 기술 기사 목록을 분석해주세요. 각 기사에 대해:
1. title_ko: 한국어 제목 (원문 제목의 자연스러운 한국어 번역, 이미 한국어면 그대로)
2. summary_ko: 한국어 요약 (2문장, 핵심 내용만)
3. insight_ko: 왜 중요한지 인사이트 (1문장, 개발자 관점)
4. tags: 태그 배열 (ai, frontend, backend, infra, startup, security, mobile, general 중 1~2개 택)
5. score_llm: 개발자 관련성 점수 (0~100)

반드시 아래 형식의 JSON 배열만 반환하세요. 다른 텍스트 없이 JSON만:
[{"id":"원본id","title_ko":"...","summary_ko":"...","insight_ko":"...","tags":["ai"],"score_llm":85}, ...]

${articleList}`;
}

export function buildWorldPrompt(articles: ArticleInput[]): string {
  const headlines = articles
    .map((a, i) => `[${i + 1}] id: "${a.id}" / ${a.title} (${a.source})`)
    .join('\n');

  return `아래 세계 뉴스 헤드라인을 분석하고:
1. world_summary: 오늘의 세계정세 5줄 요약 (한국어, 각 줄은 핵심 이슈 1개씩, 개발자/사업가 관점에서 의미 포함)
2. articles: 각 기사별 한국어 제목과 한줄 요약

반드시 아래 형식의 JSON만 반환하세요:
{"world_summary":"줄1\\n줄2\\n줄3\\n줄4\\n줄5","articles":[{"id":"원본id","title_ko":"한국어 제목","summary_ko":"한줄요약","score_llm":50}, ...]}

${headlines}`;
}
