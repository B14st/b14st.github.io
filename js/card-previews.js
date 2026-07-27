/* Add compact formula previews to topic cards without changing card navigation. */
(function () {
  'use strict';

  const topicList = document.getElementById('topic-list');
  if (!topicList || typeof TOPICS === 'undefined') return;

  const topicsByTitle = new Map(TOPICS.map(topic => [topic.title, topic]));

  function addPreviews() {
    topicList.querySelectorAll('.topic-card').forEach(card => {
      if (card.querySelector('.card-formula')) return;

      const title = card.getAttribute('aria-label');
      const topic = topicsByTitle.get(title);
      const formula = topic && topic.formula && topic.formula.primary;
      if (!formula) return;

      const subtitle = card.querySelector('.card-sub');
      if (!subtitle) return;

      const preview = document.createElement('div');
      preview.className = 'card-formula';
      preview.textContent = formula;
      preview.title = formula;
      subtitle.before(preview);
    });
  }

  addPreviews();

  const observer = new MutationObserver(addPreviews);
  observer.observe(topicList, { childList: true, subtree: true });
})();
