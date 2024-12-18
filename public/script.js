async function analyzeWord() {
    const wordInput = document.getElementById('wordInput');
    if (!wordInput) {
        console.error('Word input element not found');
        return;
    }

    const word = wordInput.value.trim();
    if (!word) {
        showError('Please enter a word');
        return;
    }

    try {
        showLoading(true);
        const response = await fetch('/synonyms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ word })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to analyze word');
        }

        const data = await response.json();
        displayResults(data);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Failed to connect to the server');
    } finally {
        showLoading(false);
    }
}

function createWordCard(wordData, index, type) {
    const card = document.createElement('div');
    card.className = 'word-card';
    
    const similarityMeter = wordData.similarityScore ? `
        <div class="meter ${getSimilarityClass(wordData.similarityScore)}">
            <div class="meter-fill" style="width: ${wordData.similarityScore}%"></div>
        </div>
        <div class="similarity-score">${wordData.similarityScore}% similar</div>
    ` : '';

    const formalityTag = `<span class="formality-tag ${getFormalityClass(wordData.formalityLevel)}">${wordData.formalityLevel}</span>`;
    
    const toneTags = wordData.toneTypes.map((tone, index) => 
        `<span class="tone-tag tone-${index + 1}">${tone}</span>`
    ).join('');

    card.innerHTML = `
        <div class="word-header">
            <span class="rank-number ${type}-rank">#${index + 1}</span>
            <h3>${wordData.word}</h3>
        </div>
        ${similarityMeter}
        <div class="word-details">
            <p><strong>Meaning:</strong> ${wordData.meaning}</p>
            <p><strong>Usage:</strong> ${wordData.nuance}</p>
            <p><strong>Example:</strong> ${wordData.example}</p>
            <div class="tags-container">
                ${formalityTag}
                ${toneTags}
            </div>
        </div>
    `;
    return card;
}

function getSimilarityClass(score) {
    if (score >= 80) return 'meter-high';
    if (score >= 50) return 'meter-medium';
    return 'meter-low';
}

function getFormalityClass(level) {
    return level.toLowerCase() === 'formal' ? 'formality-formal' : 'formality-informal';
}

function displayResults(data) {
    const synonymList = document.getElementById('synonymList');
    const antonymList = document.getElementById('antonymList');
    const originalWordSyn = document.getElementById('originalWordSyn');
    const originalWordAnt = document.getElementById('originalWordAnt');

    // Clear previous results
    synonymList.innerHTML = '';
    antonymList.innerHTML = '';

    // Set titles
    originalWordSyn.textContent = 'Synonyms';
    originalWordAnt.textContent = 'Antonyms';

    if (data.synonyms && data.synonyms.length > 0 && synonymList) {
        data.synonyms.forEach((syn, index) => {
            const card = createWordCard(syn, index, 'synonym');
            synonymList.appendChild(card);
        });
    } else if (synonymList) {
        synonymList.innerHTML = '<p class="no-results">No synonyms found</p>';
    }

    if (data.antonyms && data.antonyms.length > 0 && antonymList) {
        data.antonyms.forEach((ant, index) => {
            const card = createWordCard(ant, index, 'antonym');
            antonymList.appendChild(card);
        });
    } else if (antonymList) {
        antonymList.innerHTML = '<p class="no-results">No antonyms found</p>';
    }

    // Display idioms section
    const container = document.querySelector('.split-container');
    if (container && data.idioms && data.idioms.length > 0) {
        // Remove existing idioms section if any
        const existingIdioms = document.querySelector('.idioms-section');
        if (existingIdioms) {
            existingIdioms.remove();
        }

        const idiomsSection = document.createElement('div');
        idiomsSection.className = 'idioms-section';
        idiomsSection.innerHTML = `
            <h2>Common Phrases & Idioms</h2>
            <div class="idioms-list">
                ${data.idioms.map(idiom => `
                    <div class="idiom-card">
                        <p>${idiom}</p>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(idiomsSection);
    }
}

function showError(message) {
    const container = document.querySelector('.split-container');
    if (!container) {
        console.error('Container element not found');
        return;
    }

    // Clear existing content
    container.innerHTML = '';

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    container.appendChild(errorDiv);
}

function showLoading(show) {
    const container = document.querySelector('.split-container');
    if (!container) {
        console.error('Container element not found');
        return;
    }

    let loadingDiv = document.getElementById('loading');
    if (!loadingDiv && show) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading';
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'Analyzing word...';
        container.appendChild(loadingDiv);
    } else if (loadingDiv) {
        if (show) {
            loadingDiv.style.display = 'block';
        } else {
            loadingDiv.remove();
        }
    }
}

// Add event listener for Enter key
document.addEventListener('DOMContentLoaded', () => {
    const wordInput = document.getElementById('wordInput');
    if (wordInput) {
        wordInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                analyzeWord();
            }
        });
    }
});
