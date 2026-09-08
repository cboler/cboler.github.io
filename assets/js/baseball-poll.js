(function() {
  function unlockStory() {
    var gate = document.getElementById('reveal-gate');
    if (gate) {
      gate.classList.remove('is-locked');
      gate.classList.add('story-revealed');
    }
    var lockedElements = document.querySelectorAll('#reveal-gate, .is-locked');
    for (var i = 0; i < lockedElements.length; i++) {
      lockedElements[i].classList.remove('is-locked');
      lockedElements[i].classList.add('story-revealed');
    }
    document.body.classList.add('story-unlocked');
    try {
      sessionStorage.setItem('baseball_blind_revealed', 'true');
    } catch (e) {}
  }

  function init() {
    var btnLock = document.getElementById('btn-lock-guess');
    var btnSkip = document.getElementById('btn-skip-guess');
    var radios = document.getElementsByName('model-mapping-guess');
    var verdict = document.getElementById('guess-verdict');

    if (!btnLock || !verdict) return;

    try {
      if (sessionStorage.getItem('baseball_blind_revealed') === 'true') {
        unlockStory();
        btnLock.style.display = 'none';
        btnSkip.style.display = 'none';
        for (var i = 0; i < radios.length; i++) {
          radios[i].disabled = true;
        }
        verdict.innerHTML = '<strong>The Curtain is Lifted:</strong> <strong>App A is Gemini 3.8 Flash High</strong> (<a href="https://github.com/cboler/baseball-practice-helper" target="_blank" rel="noopener noreferrer">Baseball Practice Helper</a>), and <strong>App B is GPT-6 Astra Ultra</strong> (<a href="https://github.com/cboler/baseball-coach-helper" target="_blank" rel="noopener noreferrer">Baseball Coach Helper</a>).<div style="margin-top: 1rem;"><a href="#the-rest-of-the-story" style="color: #2aa198; font-weight: bold; text-decoration: underline;">Jump to The Rest of the Story &darr;</a></div>';
        verdict.style.display = 'block';
      }
    } catch (e) {}

    for (var j = 0; j < radios.length; j++) {
      radios[j].addEventListener('change', function() {
        btnLock.removeAttribute('disabled');
      });
    }

    function revealMapping(isSkip) {
      var selected = null;
      for (var k = 0; k < radios.length; k++) {
        if (radios[k].checked) selected = radios[k].value;
      }

      var message = '';
      if (isSkip) {
        message = '<strong>The Answer:</strong> <strong>App A is Gemini 3.8 Flash High</strong> (<a href="https://github.com/cboler/baseball-practice-helper" target="_blank" rel="noopener noreferrer">Baseball Practice Helper</a>), and <strong>App B is GPT-6 Astra Ultra</strong> (<a href="https://github.com/cboler/baseball-coach-helper" target="_blank" rel="noopener noreferrer">Baseball Coach Helper</a>).';
      } else if (selected === 'gemini-astra') {
        message = '🎯 <strong>Spot on!</strong> You correctly guessed that <strong>App A is Gemini 3.8 Flash High</strong> and <strong>App B is GPT-6 Astra Ultra</strong>.<br><br>What tipped you off? Was it the density heatmaps and voice-player selection in App A, or the custom browser icon and concurrency handling in App B?';
      } else {
        message = '⚾ <strong>A very reasonable guess!</strong> You picked Option 2, but <strong>App A was actually built by Gemini 3.8 Flash High</strong>, and <strong>App B was built by GPT-6 Astra Ultra</strong>.<br><br>The fact that so many people guess this backwards is the most interesting part of the experiment: both systems converged on nearly identical product architecture.';
      }

      verdict.innerHTML = message + '<div style="margin-top: 1rem;"><a href="#the-rest-of-the-story" style="color: #2aa198; font-weight: bold; text-decoration: underline;">Continue to The Rest of the Story &darr;</a></div>';
      verdict.style.display = 'block';

      btnLock.style.display = 'none';
      btnSkip.style.display = 'none';
      for (var l = 0; l < radios.length; l++) {
        radios[l].disabled = true;
      }

      unlockStory();

      var storySection = document.getElementById('the-rest-of-the-story');
      if (storySection) {
        setTimeout(function() {
          storySection.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    }

    btnLock.addEventListener('click', function() { revealMapping(false); });
    btnSkip.addEventListener('click', function() { revealMapping(true); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
