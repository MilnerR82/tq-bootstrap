(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const completed = new Set();
  function updateProgress() {
    const count = completed.size;
    $('progress-label').textContent = `${count} of 4`;
    $('progress-fill').style.width = `${count * 25}%`;
    $('progress-fill').parentElement.setAttribute('aria-valuenow', count);
    $('completion-message').textContent = count === 4 ? 'Lesson complete — you’ve explored type, hierarchy and spacing, and finished the knowledge check.' : `${count} of 4 activities complete. Keep experimenting to finish your learning path.`;
  }
  function complete(activity) {
    if (completed.has(activity)) return;
    completed.add(activity);
    $('step-' + activity).textContent = '✓ Complete';
    updateProgress();
    $('progress-announcement').textContent = `Activity complete. ${completed.size} of 4 activities finished.`;
  }
  function feedback(id, text, correct = false) {
    $(id).textContent = text;
    $(id).classList.toggle('is-correct', correct);
  }
  $('theme-toggle').addEventListener('click', () => {
    const dark = document.documentElement.dataset.bsTheme !== 'dark';
    document.documentElement.dataset.bsTheme = dark ? 'dark' : 'light';
    $('theme-toggle').setAttribute('aria-pressed', String(dark));
  });
  const families = {
    sans: {name: 'Sans serif · Arial', font: 'Arial, Helvetica, sans-serif', description: 'No small finishing strokes at the ends of letters. Notice the clean ends of the A and g. This is a common choice for interfaces and everyday reading.'},
    serif: {name: 'Serif · Georgia', font: 'Georgia, "Times New Roman", serif', description: 'Small finishing strokes extend from the main letter strokes. Look at the feet of the A. Serif typefaces are often used in books and editorial design.'},
    mono: {name: 'Monospace · Courier New', font: '"Courier New", Courier, monospace', description: 'Every character takes the same horizontal space. Compare narrow i with wide m: their spaces are equal. This helps columns of code line up.'}
  };
  const viewed = new Set(['sans']);
  document.querySelectorAll('[name="family"]').forEach(input => input.addEventListener('change', () => {
    const family = families[input.value];
    $('family-preview').style.fontFamily = family.font;
    $('family-name').textContent = family.name;
    $('family-description').textContent = family.description;
    viewed.add(input.value);
    $('family-feedback').textContent = viewed.size === 3 ? '✓ All three explored. Look for finishing strokes and equal character widths when you compare fonts.' : `${viewed.size} of 3 families viewed. Try the remaining family to compare its letter shapes.`;
    if (viewed.size === 3) complete('family');
  }));
  $('sample-text').addEventListener('input', event => { $('family-sentence').textContent = event.target.value || 'Small details. Big difference.'; });
  const hierarchyText = {
    flat: 'Everything has similar size and weight. The reader has to work harder to find the title.',
    loud: 'Every line competes for attention. Large, bold capitals make the details feel as urgent as the title.',
    clear: 'The title leads, the subheading adds context, and the quieter body text explains the details.'
  };
  document.querySelectorAll('[name="hierarchy"]').forEach(input => input.addEventListener('change', () => {
    $('hierarchy-preview').className = `notice-surface p-4 p-md-5 hierarchy-${input.value}`;
    $('hierarchy-description').textContent = hierarchyText[input.value];
    feedback('hierarchy-feedback', '');
  }));
  $('check-hierarchy').addEventListener('click', () => {
    const choice = document.querySelector('[name="hierarchy"]:checked').value;
    const correct = choice === 'clear';
    feedback('hierarchy-feedback', correct ? '✓ Clear levels gives the title priority, then supports it with readable details. Size, weight and space establish the order together.' : choice === 'flat' ? 'Try again: equal styling makes the title hard to distinguish. Look for a clear entry point and supporting details.' : 'Try again: when everything shouts, little stands out. Choose a treatment with distinct levels of importance.', correct);
    if (correct) complete('hierarchy');
  });
  function updateLab() {
    const size = Number($('font-size').value), line = Number($('line-height').value), width = Number($('line-width').value);
    $('size-value').textContent = `${size} px`;
    $('line-value').textContent = `${line.toFixed(1)}×`;
    $('width-value').textContent = `${width} ch`;
    // rem keeps the live sample responsive to the reader's base text size.
    Object.assign($('reading-preview').style, {fontSize: `${size / 16}rem`, lineHeight: String(line), maxWidth: `${width}ch`, textAlign: $('alignment').value});
    feedback('spacing-feedback', '');
  }
  ['font-size', 'line-height', 'line-width', 'alignment'].forEach(id => $(id).addEventListener('input', updateLab));
  $('reset-lab').addEventListener('click', () => {
    $('font-size').value = 16; $('line-height').value = 1.2; $('line-width').value = 80; $('alignment').value = 'left';
    updateLab(); feedback('spacing-feedback', 'Controls reset to the starting sample. Your completed activities are kept.');
  });
  $('check-spacing').addEventListener('click', () => {
    const suggestions = [];
    if (Number($('font-size').value) < 18) suggestions.push('increase text size to at least 18 px');
    if (Number($('line-height').value) < 1.5) suggestions.push('increase line spacing to at least 1.5×');
    if (Number($('line-width').value) < 45 || Number($('line-width').value) > 65) suggestions.push('set maximum width between 45 and 65 ch');
    if ($('alignment').value !== 'left') suggestions.push('choose left alignment');
    feedback('spacing-feedback', suggestions.length ? 'For this exercise, ' + suggestions.join('; ') + '.' : '✓ Practice targets met. This is a useful starting point, not a universal recipe. On a narrow screen, the text wraps earlier to fit the available space.', !suggestions.length);
    if (!suggestions.length) complete('spacing');
  });
  const questions = [
    {question: 'Which description matches a serif typeface?', options: ['Every character uses the same width.', 'Small finishing strokes appear at the ends of main strokes.', 'Every letter is bold and uppercase.'], answer: 1, why: 'Serifs are the finishing strokes. Equal character widths describe monospace; bold and uppercase are separate styling choices.'},
    {question: 'A page feels like one long block of equally important text. What would help?', options: ['Use a different colour for every sentence.', 'Make all the text larger and bolder.', 'Create distinct headings, supporting text and space between sections.'], answer: 2, why: 'Hierarchy gives the reader an entry point and a clear path. Real heading structure also helps assistive technology interpret the page.'},
    {question: 'Lines of a paragraph feel crowded. Which control would you try first?', options: ['Line spacing.', 'Font family only.', 'All-capital letters.'], answer: 0, why: 'Line spacing changes the distance between lines. Try a little more room, then check whether it makes the passage easier to follow.'},
    {question: 'You have found settings that look good on your laptop. What comes next?', options: ['Assume they work for everyone.', 'Make the body text smaller so more fits.', 'Check narrow screens, larger text and feedback from readers.'], answer: 2, why: 'Typography needs to work in context. Screen size, text resizing and readers’ needs can all change how well a layout works.'}
  ];
  let questionIndex = 0, answered = false;
  function renderQuestion(focus = false) {
    answered = false;
    const question = questions[questionIndex];
    $('quiz-count').textContent = `Question ${questionIndex + 1} of ${questions.length}`;
    $('quiz-question').textContent = question.question;
    $('quiz-options').replaceChildren();
    question.options.forEach((text, index) => {
      const label = document.createElement('label'); label.className = 'quiz-option';
      const input = document.createElement('input'); input.type = 'radio'; input.className = 'form-check-input'; input.name = 'quiz-answer'; input.value = index;
      const span = document.createElement('span'); span.textContent = text;
      label.append(input, span); $('quiz-options').append(label);
    });
    $('quiz-check').disabled = false;
    $('quiz-next').hidden = true;
    $('quiz-form').hidden = false;
    $('quiz-finished').hidden = true;
    feedback('quiz-feedback', '');
    if (focus) $('quiz-question').focus();
  }
  $('quiz-form').addEventListener('submit', event => {
    event.preventDefault();
    if (answered) return;
    const selected = document.querySelector('[name="quiz-answer"]:checked');
    if (!selected) { feedback('quiz-feedback', 'Choose an answer first, then check it.'); return; }
    const question = questions[questionIndex];
    if (Number(selected.value) !== question.answer) { feedback('quiz-feedback', 'Not quite. ' + question.why + ' Try another answer.'); return; }
    answered = true;
    feedback('quiz-feedback', '✓ Correct. ' + question.why, true);
    document.querySelectorAll('[name="quiz-answer"]').forEach(input => { input.disabled = true; });
    $('quiz-check').disabled = true;
    $('quiz-next').hidden = false;
    $('quiz-next').textContent = questionIndex === questions.length - 1 ? 'Finish knowledge check' : 'Next question →';
  });
  $('quiz-next').addEventListener('click', () => {
    if (!answered) return;
    if (questionIndex < questions.length - 1) { questionIndex++; renderQuestion(true); }
    else {
      complete('quiz');
      $('quiz-form').hidden = true; $('quiz-next').hidden = true; $('quiz-finished').hidden = false;
      $('quiz-count').textContent = 'Knowledge check complete · 4 of 4';
      feedback('quiz-feedback', '');
      $('quiz-restart').focus();
    }
  });
  $('quiz-restart').addEventListener('click', () => { questionIndex = 0; renderQuestion(true); });
  renderQuestion();
})();
