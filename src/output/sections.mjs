export function renderSections(title, sections) {
  const lines = [title, ''];
  for (const section of sections) {
    lines.push(`${section.title}:`);
    lines.push(...formatItems(section.items));
    lines.push('');
  }
  return lines.join('\n');
}

function formatItems(items) {
  if (!items || items.length === 0) {
    return ['- None'];
  }
  return items.map((item) => `- ${item}`);
}
