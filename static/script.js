
        // --- Socket.IO Connection ---
        const socket = io();
        
        const titleInput = {};

        const currentInput ={};

        var globalMode = "static";
        // --- Connection Status Management ---
        function updateConnectionStatus(status) {
            connectionStatus.className = `connection-status ${status}`;
            switch(status) {
                case 'connected':
                    connectionStatus.textContent = 'Connected';
                    break;
                case 'disconnected':
                    connectionStatus.textContent = 'Disconnected';
                    break;
                case 'connecting':
                    connectionStatus.textContent = 'Connecting...';
                    break;
                default:
                    connectionStatus.textContent = 'Unknown';
            }
        }

        // --- Donation Popup Overlay ---
        function showDonationPopup(amount) {
          console.log(amount, globalMode)
          if (globalMode === 'static') {
            return;
          }
            // Avoid stacking many overlays
            const existing = document.getElementById('donationOverlay');
            if (existing) {
                try { existing.remove(); } catch (_) {}
            }

            // Create overlay
            const overlay = document.createElement('div');
            overlay.id = 'donationOverlay';
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.background = 'rgba(0,0,0,0.6)';
            overlay.style.zIndex = '10000';
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 300ms ease';

            // Inner popup
            const popup = document.createElement('div');
            popup.style.background = 'rgba(255,255,255,0.98)';
            popup.style.borderRadius = '16px';
            popup.style.padding = '24px 28px';
            popup.style.boxShadow = '0 20px 60px rgba(0,0,0,0.35)';
            popup.style.display = 'flex';
            popup.style.flexDirection = 'column';
            popup.style.alignItems = 'center';
            popup.style.gap = '12px';
            popup.style.maxWidth = '90vw';
            popup.style.maxHeight = '90vh';

            const img = document.createElement('img');
            img.src = '/static/donation_dance.gif';
            img.alt = 'Donation celebration';
            img.style.width = 'min(360px, 60vw)';
            img.style.height = 'auto';
            img.style.display = 'block';

            const p = document.createElement('div');
            p.style.fontSize = '20px';
            p.style.fontWeight = '700';
            p.style.color = '#1f2937';
            p.style.textAlign = 'center';
            const amt = Number(amount);
            if (!Number.isNaN(amt) && amt > 0) {
                p.textContent = `Thank you for the $${amt.toLocaleString('en-US', {maximumFractionDigits: 2})}!`;
            } else {
                p.textContent = 'Thank you for your donation!';
            }

            popup.appendChild(img);
            popup.appendChild(p);
            overlay.appendChild(popup);
            document.body.appendChild(overlay);

            // Fade in
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
            });

            // Hold, then fade out and remove
            const holdMs = 2500;
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    try { overlay.remove(); } catch (_) {}
                }, 320);
            }, holdMs);
        }

        // --- Socket Event Handlers ---
        socket.on('connect', async () => {
            console.log('Connected to server');
            updateConnectionStatus('connected');
            // Fetch and apply current mode on connect
            // try {
            //     const res = await fetch('/mode');
            //     if (res.ok) {
            //         const data = await res.json();
            //         if (data && data.mode) applyMode(data.mode);
            //     }
            // } catch (e) {
            //     console.warn('Failed to load mode:', e);
            // }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            updateConnectionStatus('disconnected');
        });

        socket.on('connecting', () => {
            console.log('Connecting to server...');
            updateConnectionStatus('connecting');
        });

        socket.on('donationUpdate', (data) => {
            console.log('Received donation update:', data);
            updateInputsFromServer(data);
            updateUI();
        });

        socket.on('modeChanged', (payload) => {
            const mode = payload && payload.mode;
            if (mode) {
                console.log('Applying modeChanged:', mode);
                applyMode(mode);
            }
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
            alert('Error: ' + error.message);
        });

        socket.on('syncResult', (result) => {
            console.log('Sync result received:', result);
            if (result.success) {
                console.log('Sync successful:', result.message);
                // Show success feedback (you can replace alert with a better UI notification)
                const statusElement = document.createElement('div');
                statusElement.style.cssText = 'position: fixed; top: 70px; right: 10px; background: #28a745; color: white; padding: 10px; border-radius: 5px; z-index: 1001; font-size: 12px;';
                statusElement.textContent = result.message;
                document.body.appendChild(statusElement);
                setTimeout(() => statusElement.remove(), 5000);
            } else {
                console.error('Sync failed:', result.message);
                alert('Sync failed: ' + result.message);
            }
        });

        socket.on('pledgeResult', (result) => {
            console.log('Pledge result received:', result);
            const statusElement = document.createElement('div');
            statusElement.style.cssText = `position: fixed; top: 70px; right: 10px; background: ${result.success ? '#28a745' : '#dc3545'}; color: white; padding: 10px; border-radius: 5px; z-index: 1001; font-size: 12px;`;
            statusElement.textContent = result.message;
            document.body.appendChild(statusElement);
            setTimeout(() => statusElement.remove(), 5000);
            
            // Clear pledge input on successful add
            if (result.success && !result.message.includes('reset')) {
                document.getElementById('pledgeInput').value = '';
            }
        });

        socket.on('donation_test', (data) => {
            console.log('Received donation test:', data);
            updateInputsFromServer(data);
            updateUI();
            try {
                if (data.currentInputChange) return;
                showDonationPopup(data && (data.value));
            } catch (e) {
                console.error('Error showing donation popup:', e);
            }
        });

        // --- Data Handling Functions ---
        function updateInputsFromServer(data) {
            
            currentInput.value += data.value || 0;

            if (data.titleChange) {
              titleInput.value = data.titleChange;
            }

            // if (data.goalChange) {
            //   goalInput.value += data.goalChange;
            // }

            if (data.currentInputChange) {
              currentInput.value = data.currentInputChange;
            }
            // titleInput.value = data.title || '';
            // sloganInput.value = data.slogan || '';
            // imageInput.value = data.image || '';
            
            // Update pledge display amounts
            if (document.getElementById('scrapedAmount')) {
                document.getElementById('scrapedAmount').textContent = '$' + (data.scraped || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }
            if (document.getElementById('pledgeAmount')) {
                document.getElementById('pledgeAmount').textContent = '$' + (data.pledges || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }
        }

        function sendDonationUpdate() {
            const data = {
                // goal: parseFloat(goalInput.value) || 0,
                current: parseFloat(currentInput.value) || 0,
                title: titleInput.value,
                slogan: sloganInput.value,
                image: imageInput.value
            };
            socket.emit('updateDonation', data);
        }

        // --- UI Update Function ---
        function updateUI() {
            // const goal = parseFloat(goalInput.value) || 0;
            const current = parseFloat(currentInput.value) || 0;

            // // Update title and image
            // campaignTitle.textContent = titleInput.value;
            // campaignSlogan.textContent = sloganInput.value;
            // campaignImage.src = imageInput.value;

            // Update amount text with proper currency formatting
            // currentAmountText.textContent = `$${current.toLocaleString('en-US', {
            //     minimumFractionDigits: 0,
            //     maximumFractionDigits: 0
            // })}`;
            // goalAmountText.textContent = `$${goal.toLocaleString('en-US', {
            //     minimumFractionDigits: 0,
            //     maximumFractionDigits: 0
            // })}`;


            
            // Update goal markers with dynamic dollar amounts
            // document.getElementById('goal100').textContent = `$${goal.toLocaleString('en-US')}`;
            // document.getElementById('goal75').textContent = `$${(goal * 0.75).toLocaleString('en-US')}`;
            // document.getElementById('goal50').textContent = `$${(goal * 0.5).toLocaleString('en-US')}`;
            // document.getElementById('goal25').textContent = `$${(goal * 0.25).toLocaleString('en-US')}`;
            // document.getElementById('goal0').textContent = '$0';

            // Update vertical thermometer
            // const percentage = Math.min((current / goal) * 100, 100);
            // thermometerFillVertical.style.height = `${percentage}%`;
            // percentageDisplay.textContent = `${Math.round(percentage)}%`;

            // console.log(goal, current, percentage)

            // Goal achievement celebration
            // if (percentage >= 100) {
            //     thermometerFillVertical.classList.add('goal-reached');
            //     thermometerBulb.classList.add('goal-reached');
            //     percentageDisplay.textContent = '🎉 Goal Reached!';

            //     // Trigger confetti burst explosion only when goal is first reached
            //     if (!goalReachedBefore) {
            //         triggerGoalReachedConfetti();
            //         goalReachedBefore = true;
            //     }
            // } else {
            //     thermometerFillVertical.classList.remove('goal-reached');
            //     thermometerBulb.classList.remove('goal-reached');
            //     percentageDisplay.textContent = `${Math.round(percentage)}%`;
            //     goalReachedBefore = false;
            //     stopConfettiLoop(); // Stop confetti when goal is no longer reached
            // }
        }

        // --- Mode Application ---
        function applyMode(mode) {
            try {
                const normalized = (mode || 'standard').toLowerCase();
                const body = document.body;
                body.classList.remove('mode-standard', 'mode-compact', 'mode-minimal');
                body.classList.add(`mode-${normalized}`);

                const thermoOuter = document.querySelector('.vertical-thermometer');
                const bulb = document.getElementById('thermometerBulb');
                const percent = document.getElementById('percentageDisplay');
                const qrImg = document.querySelector('img[alt="Donation QR Code"]');
                const goals = document.querySelector('.goal-markers');

                // Defaults for 'standard'
                let outerHeight = '400px';
                let bulbSize = { w: '140px', h: '140px', bottom: '-25px', inner: { w: '95px', h: '95px' } };
                let showPercent = true;
                let showQR = true;
                let showGoals = true;

                if (normalized === 'static') {
                  console.log('static mode')
                  globalMode = 'static';
                  document.getElementById('constantDance').removeAttribute('hidden')
                  document.getElementById('constantSleep').hidden = true;
                   
                } else if (normalized === 'dynamic') {
                  console.log(' mode')
                    showQR = false;
                    globalMode = 'dynamic';

                    document.getElementById('constantDance').hidden = true;
                   
                    document.getElementById('constantSleep').removeAttribute('hidden')

                } else {
                  console.log('statparially sdyniic mode')
                  globalMode = 'partially-dynamic';
                  document.getElementById('constantDance').hidden = true;
                  document.getElementById('constantSleep').hidden = true;
                 
                }

                // if (thermoOuter) thermoOuter.style.height = outerHeight;
                // if (bulb) {
                //     bulb.style.width = bulbSize.w;
                //     bulb.style.height = bulbSize.h;
                //     bulb.style.bottom = bulbSize.bottom;
                //     const inner = bulb.querySelector('.thermometer-inner-bulb');
                //     if (inner) {
                //         inner.style.width = bulbSize.inner.w;
                //         inner.style.height = bulbSize.inner.h;
                //     }
                // }
                // if (percent) percent.style.display = showPercent ? '' : 'none';
                // if (qrImg) qrImg.style.display = showQR ? '' : 'none';
                // if (goals) goals.style.display = showGoals ? '' : 'none';
            } catch (e) {
                console.warn('applyMode error:', e);
            }
        }

        // --- Confetti Functions ---
        function triggerGoalReachedConfetti() {
            // Reset counter and fire first confetti
            confettiCount = 1;
            jsConfetti.addConfetti();

            // Start looping confetti every 2 seconds, but only 3 times total
            confettiInterval = setInterval(() => {
                confettiCount++;
                jsConfetti.addConfetti();

                // Stop after 3 total bursts
                if (confettiCount >= 3) {
                    stopConfettiLoop();
                }
            }, 2000);
        }

        function stopConfettiLoop() {
            if (confettiInterval) {
                clearInterval(confettiInterval);
                confettiInterval = null;
            }
            confettiCount = 0;
        }

        // --- Event Listeners ---
        // Listen for changes on goal, title, slogan, and image to send updates
        // [goalInput, titleInput, sloganInput, imageInput].forEach(input => {
        //     input.addEventListener('input', () => {
        //         sendDonationUpdate();
        //     });
        // });

        // Event listener for the Update Amount button
        // updateAmountButton.addEventListener('click', () => {
        //     sendDonationUpdate();
        // });

        // Event listeners for quick amount buttons
        // document.querySelectorAll('.quick-add').forEach(button => {
        //     button.addEventListener('click', () => {
        //         const addAmount = parseFloat(button.dataset.amount);
        //         socket.emit('quickAdd', addAmount);
        //     });
        // });

        // Reset button functionality
        // resetButton.addEventListener('click', () => {
        //     const isConfirmed = window.confirm('Are you sure you want to reset all data? This cannot be undone.');
        //     if (isConfirmed) {
        //         socket.emit('reset');
        //     }
        // });

        // Sync with Donorbox button functionality
        // syncDonorboxButton.addEventListener('click', () => {
        //     syncDonorboxButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Syncing...';
        //     syncDonorboxButton.disabled = true;
            
        //     socket.emit('syncDonorbox');
            
        //     // Re-enable button after 3 seconds
        //     setTimeout(() => {
        //         syncDonorboxButton.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Sync with Donorbox';
        //         syncDonorboxButton.disabled = false;
        //     }, 3000);
        // });

        // // Add Pledge button functionality
        // addPledgeButton.addEventListener('click', () => {
        //     const amount = parseFloat(pledgeInput.value);
        //     if (isNaN(amount) || amount <= 0) {
        //         alert('Please enter a valid pledge amount greater than $0.');
        //         return;
        //     }
            
        //     socket.emit('addPledge', amount);
        // });

        // // Reset Pledges button functionality
        // resetPledgesButton.addEventListener('click', () => {
        //     const isConfirmed = window.confirm('Are you sure you want to reset all pledges? This cannot be undone.');
        //     if (isConfirmed) {
        //         socket.emit('resetPledges');
        //     }
        // });

        // // Allow Enter key to add pledge
        // pledgeInput.addEventListener('keypress', (e) => {
        //     if (e.key === 'Enter') {
        //         addPledgeButton.click();
        //     }
        // });

        // Initial connection status
        updateConnectionStatus('connecting');







