// Web Speech API implementation for voice input
let recognition;

// Wait for the DOM to be fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('Speech recognition script loaded');

    // Re-attach event listeners to make sure they work
    const startRecording = document.getElementById('startRecording');
    const stopRecording = document.getElementById('stopRecording');

    if (startRecording) {
        startRecording.addEventListener('click', function() {
            console.log('Start recording clicked');
            startVoiceRecording();
        });
    }

    if (stopRecording) {
        stopRecording.addEventListener('click', function() {
            console.log('Stop recording clicked');
            stopVoiceRecording();
        });
    }
});

function startVoiceRecording() {
    console.log('Starting voice recording...');
    const startRecording = document.getElementById('startRecording');
    const stopRecording = document.getElementById('stopRecording');
    const recordingStatus = document.getElementById('recordingStatus');
    const transcriptionResult = document.getElementById('transcriptionResult');
    const submitVoiceInput = document.getElementById('submitVoiceInput');

    // Clear any previous transcription
    if (transcriptionResult) {
        transcriptionResult.textContent = '';
    }

    if (startRecording) startRecording.disabled = true;
    if (stopRecording) stopRecording.disabled = false;
    if (recordingStatus) recordingStatus.textContent = 'Recording...';
    if (submitVoiceInput) submitVoiceInput.disabled = true;

    // Add recording-active class to the recording indicator
    const recordingIndicator = document.querySelector('.recording-indicator');
    if (recordingIndicator) {
        recordingIndicator.classList.add('recording-active');
    }

    // Use Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true; // Set to true to enable continuous recording until manually stopped
        recognition.interimResults = true;

        let finalTranscriptText = '';

        recognition.onresult = function(event) {
            console.log('Speech recognition result received');
            let interimTranscript = '';
            let finalTranscript = '';

            // Get the latest result
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Update the final transcript text by appending new final transcripts
            if (finalTranscript) {
                // Add a space before appending if there's already text and it doesn't end with a space
                if (finalTranscriptText && !finalTranscriptText.endsWith(' ')) {
                    finalTranscriptText += ' ';
                }
                finalTranscriptText += finalTranscript;
            }

            // Update the UI with the current transcription
            if (transcriptionResult) {
                // Show accumulated final transcript plus any current interim transcript
                let displayText = finalTranscriptText;
                if (interimTranscript) {
                    // Add a space before appending if there's already text and it doesn't end with a space
                    if (displayText && !displayText.endsWith(' ')) {
                        displayText += ' ';
                    }
                    displayText += interimTranscript;
                }
                transcriptionResult.textContent = displayText;
            }

            // Enable submit button if we have text
            if (submitVoiceInput) {
                submitVoiceInput.disabled = !(finalTranscriptText || interimTranscript);
            }

            // Keep the recording status as "Recording..." to indicate it's still active
            if (recordingStatus) recordingStatus.textContent = 'Recording...';
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            if (recordingStatus) recordingStatus.textContent = 'Error: ' + event.error;
            if (startRecording) startRecording.disabled = false;
            if (stopRecording) stopRecording.disabled = true;
        };

        recognition.onend = function() {
            console.log('Speech recognition ended');

            // Check if we should restart the recognition (if stop button is still enabled, it means
            // the user didn't manually stop the recording)
            const stopRecording = document.getElementById('stopRecording');
            if (stopRecording && !stopRecording.disabled) {
                console.log('Restarting speech recognition...');
                try {
                    // Restart recognition to keep recording
                    recognition.start();
                    return;
                } catch (error) {
                    console.error('Error restarting speech recognition:', error);
                }
            }

            // If we reach here, it means we're not restarting the recognition
            // Update the UI to show recording has stopped
            const startRecording = document.getElementById('startRecording');
            if (startRecording) startRecording.disabled = false;
            if (stopRecording) stopRecording.disabled = true;
            if (recordingStatus) recordingStatus.textContent = 'Recording stopped';

            // Remove recording-active class from the recording indicator
            const recordingIndicator = document.querySelector('.recording-indicator');
            if (recordingIndicator) {
                recordingIndicator.classList.remove('recording-active');
            }

            // If we have a transcription, enable the submit button
            const transcriptionResult = document.getElementById('transcriptionResult');
            const submitVoiceInput = document.getElementById('submitVoiceInput');

            if (submitVoiceInput && transcriptionResult && transcriptionResult.textContent.trim()) {
                submitVoiceInput.disabled = false;
            }
        };

        try {
            recognition.start();
            console.log('Speech recognition started');
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            if (recordingStatus) recordingStatus.textContent = 'Error starting recognition: ' + error.message;
            if (startRecording) startRecording.disabled = false;
            if (stopRecording) stopRecording.disabled = true;
        }
    } else {
        console.warn('Speech recognition not supported in this browser');
        if (recordingStatus) recordingStatus.textContent = 'Speech recognition not supported in this browser';
        if (startRecording) startRecording.disabled = false;
        if (stopRecording) stopRecording.disabled = true;
    }
}

function stopVoiceRecording() {
    console.log('Stopping voice recording...');
    const startRecording = document.getElementById('startRecording');
    const stopRecording = document.getElementById('stopRecording');
    const recordingStatus = document.getElementById('recordingStatus');
    const submitVoiceInput = document.getElementById('submitVoiceInput');
    const transcriptionResult = document.getElementById('transcriptionResult');

    if (recognition) {
        try {
            recognition.stop();
            console.log('Speech recognition stopped');
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    }

    if (startRecording) startRecording.disabled = false;
    if (stopRecording) stopRecording.disabled = true;
    if (recordingStatus) recordingStatus.textContent = 'Recording stopped';

    // Remove recording-active class from the recording indicator
    const recordingIndicator = document.querySelector('.recording-indicator');
    if (recordingIndicator) {
        recordingIndicator.classList.remove('recording-active');
    }

    // Enable submit button if we have text
    if (submitVoiceInput && transcriptionResult && transcriptionResult.textContent.trim()) {
        submitVoiceInput.disabled = false;
    }
}
