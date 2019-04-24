let config;
let socket;
let apiUrl;
let socketUrl;
let user_id;

const YouMarkAPI = {

  getMarkers() {
    const video_id = window.location.href.split('=')[1];
    $.ajax({
      url: `${apiUrl}/marker/${video_id}/${user_id}`,
      dataType: 'json',
    })
      .done(function (markers) {
        // Show controls (if they are hidden)
        View.showControls();

        for (let i = 0; i < markers.length; i++) {
          const { _id, text, progress, time } = markers[i];

          // Add marker
          View.addMarker(text, _id, progress);
          // Add option
          View.addOption(text, _id, time, markers[i].user_id);
        }
        // Sort select list
        Util.sortList({ option: 'default' });
      })
      .fail(function (jqXHR, textStatus, err) {
        console.log(err);
        console.log(jqXHR);
        console.log(textStatus);
        View.inputError('Could not get markers');
      });
  },

  saveMarker(input, progress, time, cb) {
    const video_id = window.location.href.split('=')[1];

    const body = {
      user_id,
      video_id,
      text: input,
      progress,
      time,
    };

    $.ajax({
      url: `${apiUrl}/marker`,
      data: JSON.stringify(body),
      contentType: 'application/json',
      method: 'POST',
    }).done(function (marker) {
      socket.emit('markerAdd', marker);
      cb(marker);
    }).fail(function (jqXHR, textStatus, err) {
      console.log(err);
      console.log(jqXHR);
      console.log(textStatus);
      cb({ err: 'Could not add marker' });
    });
  },

  deleteMarker(id, cb) {
    $.ajax({
      url: `${apiUrl}/marker/${id}/${user_id}`,
      method: 'DELETE',
    }).done(function () {
      socket.emit('markerRemove', { _id: id });
      cb();
    }).fail(function (jqXHR, textStatus, err) {
      console.log(err);
      console.log(jqXHR);
      console.log(textStatus);
      cb({ err: 'Could not delete marker' });
    });
  },

  reportMarker(id, cb) {
    $.ajax({
      url: `${apiUrl}/marker/report/${id}`,
      method: 'PATCH',
    }).done(function () {
      cb();
    }).fail(function (jqXHR, textStatus, err) {
      console.log(err);
      console.log(jqXHR);
      console.log(textStatus);
      cb('Could not report marker');
    });
  },
};

const Socket = {

  initSocket() {
    socket = io(socketUrl);

    socket.on('markerAdd', function (marker) {
      // Add marker
      View.addMarker(marker.text, marker._id, marker.progress);
      // Add option
      View.addOption(marker.text, marker._id, marker.time);
      // Sort select list
      Util.sortList();
    });

    socket.on('markerRemove', function (marker) {
      // Remove marker
      View.removeMarker(marker._id);
    });
  },
};

const Environment = {

  init(cb) {
    Environment.getConfig(() => {
      Environment.setUserId(() => {
        cb();
      });
    });
  },

  getConfig(cb) {
    chrome.runtime.sendMessage({ message: 'getConfig' }, (_config) => {
      config = _config;
      ({ apiUrl, socketUrl } = config);
      cb();
    });
  },

  setUserId(cb) {
    if (config.isProduction) {
      chrome.storage.sync.get(['user_id'], (res) => {
        if (res.user_id) {
          ({ user_id } = res);
          cb();
        } else {
          user_id = uuid.v4();
          chrome.storage.sync.set({ user_id }, () => {
            cb();
          });
        }
      });
    } else {
      user_id = uuid.v4();
      cb();
    }
  },
};

const View = {

  init() {
    // Content Div
    const cont = document.createElement('div');
    cont.setAttribute('id', 'marker-cont');
    cont.style.width = $('#movie_player').css('width');

    // Upper content div
    const upperCont = document.createElement('div');
    upperCont.setAttribute('id', 'marker-upperCont');
    cont.appendChild(upperCont);

    // Lower content div
    const lowerCont = document.createElement('div');
    lowerCont.setAttribute('id', 'marker-lowerCont');
    cont.appendChild(lowerCont);

    // Input
    const inputDiv = document.createElement('div');
    inputDiv.setAttribute('id', 'submitInputDiv');
    const input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('id', 'submitInput');
    input.setAttribute('class', 'submitInputControl');
    const inputLabel = document.createElement('label');
    inputLabel.setAttribute('id', 'inputLabel');
    const labelText = document.createTextNode('Add a marker ...');
    const inputError = document.createElement('span');
    inputError.setAttribute('id', 'inputError');
    inputDiv.appendChild(input);
    inputLabel.appendChild(labelText);
    inputDiv.appendChild(inputLabel);
    lowerCont.appendChild(inputError);
    upperCont.appendChild(inputDiv);

    // Submit div
    const submitDiv = document.createElement('div');
    submitDiv.setAttribute('id', 'submitDiv');
    submitDiv.setAttribute('class', 'ripple rippleSelector');
    upperCont.appendChild(submitDiv);
    // Submit button
    const submit = document.createElement('div');
    submit.setAttribute('id', 'btnSubmit');
    submitDiv.appendChild(submit);
    // Submit text
    const addText = document.createElement('SPAN');
    // addText.setAttribute('class', 'yt-uix-button-content');
    addText.setAttribute('id', 'addText');
    const aText = document.createTextNode('ADD');
    addText.appendChild(aText);
    submitDiv.appendChild(addText);

    // Left select button
    const leftDiv = document.createElement('div');
    leftDiv.setAttribute('class', 'rippleSelectBtns rippleSelectSelector');
    const left = document.createElement('img');
    left.setAttribute('id', 'marker-btnLeft');
    left.setAttribute('class', 'marker-selectBtns');
    left.src = chrome.extension.getURL('img/left.svg');
    leftDiv.appendChild(left);
    upperCont.appendChild(leftDiv);

    // Select
    const selectDiv = document.createElement('div');
    selectDiv.setAttribute('class', 'borderMethod');
    const select = document.createElement('SELECT');
    select.setAttribute('id', 'marker-select');
    // Options
    const def_option = document.createElement('OPTION');
    def_option.setAttribute('value', 'default');
    const def_text = document.createTextNode('Jump to marker');
    def_option.appendChild(def_text);
    select.appendChild(def_option);
    selectDiv.appendChild(select);
    upperCont.appendChild(selectDiv);


    // Right select button
    const right = document.createElement('img');
    const rightDiv = document.createElement('div');
    rightDiv.setAttribute('class', 'rippleSelectBtns rippleSelectSelector');
    right.setAttribute('id', 'marker-btnRight');
    right.setAttribute('class', 'marker-selectBtns');
    right.src = chrome.extension.getURL('img/right.svg');
    rightDiv.appendChild(right);
    upperCont.appendChild(rightDiv);

    // Delete div
    const deleteDiv = document.createElement('div');
    deleteDiv.setAttribute('id', 'deleteDiv');
    deleteDiv.setAttribute('class', 'ripple rippleSelector');
    upperCont.appendChild(deleteDiv);
    // Delete Btn
    const btnDelete = document.createElement('div');
    btnDelete.setAttribute('id', 'btnDelete');
    deleteDiv.appendChild(btnDelete);
    // Delete text
    const removeText = document.createElement('SPAN');
    removeText.setAttribute('id', 'deleteText');
    const rText = document.createTextNode('REMOVE');
    removeText.appendChild(rText);
    deleteDiv.appendChild(removeText);
    // Report Btn
    const btnReport = document.createElement('img');
    btnReport.src = chrome.extension.getURL('img/report.svg');
    btnReport.setAttribute('id', 'btnReport');
    btnReport.style.display = 'none';
    deleteDiv.appendChild(btnReport);
    // Report text
    const reportText = document.createElement('SPAN');
    reportText.setAttribute('id', 'reportText');
    reportText.style.display = 'none';
    const rTextNode = document.createTextNode('REPORT');
    reportText.appendChild(rTextNode);
    deleteDiv.appendChild(reportText);
    // Delete/Report message
    const delMessage = document.createElement('SPAN');
    delMessage.setAttribute('id', 'delMessage');
    lowerCont.appendChild(delMessage);
    const element = document.getElementById('clarify-box');
    element.after(cont);

    // Remove pointer-event on progress ball
    $('.ytp-scrubber-container').css('pointer-events', 'none');
  },

  onAdd() {
    $('#submitDiv').on('click', function () {
      const progress = Util.getProgress();

      const time = Util.formatTime($('.html5-main-video')[0].currentTime);

      const input = $('#submitInput').val();

      const input_lc = input.toLowerCase();

      if ($('#submitDiv.disabled').length === 0) {
        if ($.trim(input) !== '') {
          if (input.length <= 20) {
            if (View.checkName(input_lc) && input_lc !== 'jump to marker') {
              if (View.checkTime()) {
                if (View.checkNetwork()) {
                  YouMarkAPI.saveMarker(input, progress, time, (marker) => {
                    if (!marker.err) {
                      View.showControls();

                      View.addMarker(marker.text, marker._id, marker.progress, false);

                      View.addOption(marker.text, marker._id, marker.time, user_id);

                      Util.sortList({ option: 'option-' + marker._id });

                      View.inputReset();

                      View.transitionMarker(marker._id);
                    } else {
                      View.inputError(marker.err);
                    }
                  });
                } else {
                  View.inputError('Video is loading. Try again.');
                }
              } else {
                View.inputError('Marker is too close to another marker');
              }
            } else {
              View.inputError('Marker name already exist. Choose another.');
            }
          } else {
            View.inputError('Too long marker name (max 20 characters)');
          }
        } else {
          View.inputError('Enter marker name');
        }
      }
    });
  },

  onSelectChange() {
    $('#marker-select').change(function () {
      // Get option value
      const selected = $(this).find('option:selected').text();

      if (selected !== 'Jump to marker') {
        // Jump to marker
        View.jumpTo(selected);
        // Show controls (if they are hidden)
        View.showControls();
        // Show remove or report button
        View.removeOrReportBtn();
      }
    });
  },

  onNavBtns() {
    $('.marker-selectBtns').on('click', function () {
      let jumpToOption;

      if ($(this)[0].id === 'marker-btnLeft') {
        jumpToOption = $('#marker-select option:selected').prev().val();
      } else {
        jumpToOption = $('#marker-select option:selected').next().val();
      }

      if (jumpToOption && jumpToOption !== 'default') {
        jumpToMarker(jumpToOption);
      }

      function jumpToMarker(_jumpToOption) {
        $('#marker-select').val(_jumpToOption);
        $('#marker-select').trigger('change');

        View.adjustMarker();
      }
    });
  },

  onRemove() {
    $('#deleteDiv').on('click', function () {
      const selected = $('#marker-select option:selected').text();

      if (selected !== 'Jump to marker') {
        const selectedOption = $('#marker-select option:selected');
        const remove_id = selectedOption.val().split('-')[1];
        if (selectedOption.attr('user_id') === 'not_authorized') {
          YouMarkAPI.reportMarker(remove_id, (err) => {
            if (!err) {
              View.removeOutput('Marker reported', { success: true });
            } else {
              View.removeOutput(err);
            }
          });
        } else {
          YouMarkAPI.deleteMarker(remove_id, (err) => {
            // Remove marker
            View.removeMarker(remove_id);
            // Show controls (if they are hidden)
            View.showControls();

            if (err) {
              View.removeOutput(err);
            }
          });
        }
      }
    });
  },

  onMarkerClick() {
    $('.ytp-progress-list').on('click', function (e) {
      View.changeOption(e);
    });
  },

  onMarkerHover() {
    $(document).on('mouseenter', '.markersHover', function () {
      let markerID = $(this).attr('id');
      markerID = markerID.replace('markerHover-', '');
      $('#title-' + markerID).css('display', 'block');
    })
      .on('mouseleave', '.markersHover', function () {
        let markerID = $(this).attr('id');
        markerID = markerID.replace('markerHover-', '');
        $('#title-' + markerID).css('display', 'none');
      });
  },

  onBtnsHover() {
    $(document).on('mouseenter', '#submitDiv, #deleteDiv, #marker-btnLeft, #marker-btnRight', function () {
      $(this).css('color', 'hsla(0, 0%, 6.7%, .8)');
      if ($(this)[0].id === 'deleteDiv') {
        if ($('#btnDelete').attr('remove') === 'remove') {
          $('#btnDelete').css('opacity', '.8');
        } else {
          $('#btnDelete').css('opacity', '.6');
        }
      } else if ($(this)[0].id === 'submitDiv') {
        $('#btnSubmit').css('opacity', '.7');
      } else {
        $(this).css('opacity', '.7');
      }
    })
      .on('mouseleave', '#submitDiv, #deleteDiv, #marker-btnLeft, #marker-btnRight', function () {
        $(this).css('color', 'hsla(0, 0%, 6.7%, .4)');
        if ($(this)[0].id === 'deleteDiv') {
          if ($('#btnDelete').attr('remove')) {
            $('#btnDelete').css('opacity', '.5');
          } else {
            $('#btnDelete').css('opacity', '.35');
          }
        } else if ($(this)[0].id === 'submitDiv') {
          $('#btnSubmit').css('opacity', '.4');
        } else {
          $(this).css('opacity', '.4');
        }
      });
  },

  onInputFocus() {
    $('#submitInput').each(function () {
      changeState($(this));
    });

    $('#submitInput').on('focusout', function () {
      changeState($(this));
    });

    function changeState($formControl) {
      if ($formControl.val().length > 0) {
        $formControl.addClass('has-value');
      } else {
        $formControl.removeClass('has-value');
      }
    }
  },

  onWindowResize() {
    new ResizeSensor($('#info'), function () {
      const newWidth = $('#movie_player').css('width');
      const marginLeft = $('#player-container-outer').css('margin-left');

      $('#marker-cont').css('width', newWidth);
      $('#marker-cont').css('margin-left', marginLeft);

      if (parseInt(newWidth, 10) <= 426) {
        $('#marker-select').css('maxWidth', '120px');
        $('#submitInputDiv').css('maxWidth', '70px');
        $('#inputLabel').text('Add ...');
      } else {
        $('#marker-select').css('maxWidth', '');
        $('#submitInputDiv').css('maxWidth', '');
        $('#inputLabel').text('Add a marker ...');
      }
    });
  },

  onCommercial() {
    if ($('.videoAdUi').length) {
      const videoAd = [{ added: [1], removed: [] }];
      adVideo(videoAd);
    }

    new MutationSummary({
      callback: adVideo,
      queries: [{
        element: '.videoAdUi',
      }],
    });

    function adVideo(summaries) {
      if (summaries[0].added.length > 0) {
        View.disableElements();
      } else if (summaries[0].removed.length > 0) {
        View.enableElements();
      }
    }
  },

  onLive() {
    if ($('.ytp-live').length) {
      const live = [{ added: [1], removed: [] }];
      liveVideo(live);
    }

    new MutationSummary({
      callback: liveVideo,
      queries: [{
        element: '.ytp-live',
      }],
    });

    function liveVideo(summaries) {
      if (summaries[0].added.length > 0) {
        View.disableElements();
      } else if (summaries[0].removed.length > 0) {
        View.enableElements();
      }
    }
  },

  onMarkerAd() {
    if ($('.ytp-ad-progress').length) {
      const adMarkers = [{ added: $('.ytp-ad-progress') }];
      adMarker(adMarkers);
    }
    new MutationSummary({
      callback: adMarker,
      queries: [{
        element: '.ytp-ad-progress',
      }],
    });

    function adMarker(summaries) {
      if (summaries[0].added.length > 0) {
        View.removeAdMarker(summaries[0].added);
      }
    }
  },

  onVideoChange() {
    new MutationSummary({
      callback: videoChange,
      queries: [{
        element: '.html5-main-video',
        elementAttributes: 'src',
      }],
    });

    let oldVideo = $('.html5-main-video').attr('src');

    function videoChange(summaries) {
      const newVideo = summaries[0].attributeChanged.src[0].src;
      const videoAd = $('.videoAdUi').length;

      if (oldVideo !== newVideo && !videoAd) {
        oldVideo = newVideo;

        View.removeMarkers();

        View.inputReset();

        YouMarkAPI.getMarkers();
      }
    }
  },

  onTimeUpdate() {
    let oldTime;

    $('.html5-main-video').on('timeupdate', function () {
      const time = Util.formatTime($(this)[0].currentTime);

      $('#marker-select > option').each(function () {
        const markerTime = this.text.split(' - ')[0];

        // If red progress bar time is matching marker time
        if (time === markerTime) {
          // Only check whole seconds
          if (time !== oldTime) {
            // If select isn't open
            if (!$('#marker-select').is(':focus')) {
              $('#marker-select').val($(this).val());
              View.removeOrReportBtn();
            }
          }
        }
      });
      oldTime = time;
    });
  },

  addMarker(input, id, progress, transition) {
    // Get progress
    // const progress = Util.getProgress()

    // Visible marker div
    const marker = document.createElement('div');
    marker.setAttribute('class', 'markers');
    marker.setAttribute('id', 'marker-' + id);
    let st = marker.style;
    st.position = 'absolute';
    st.background = 'blue';
    st.width = '6px';
    st.height = '100%';
    st.zIndex = 991;
    st.marginLeft = progress + '%';
    st.left = '-3px';
    st.display = 'inline';
    if (transition) st.visibility = 'hidden';

    // Invisible hover marker div
    const markerHover = document.createElement('div');
    markerHover.setAttribute('class', 'markersHover');
    markerHover.setAttribute('id', 'markerHover-' + id);
    st = markerHover.style;
    st.position = 'absolute';
    st.width = '10px';
    st.top = '-12px';
    st.bottom = '-5px';
    st.left = '-2px';
    st.zIndex = 990;
    st.display = 'inline';

    marker.appendChild(markerHover);
    $('.ytp-progress-list').append(marker);

    // Title on preview image
    const title = document.createElement('div');
    title.setAttribute('id', 'title-' + id);
    const titleText = document.createTextNode(input);
    title.innerText = titleText.textContent;
    st = title.style;
    st.display = 'none';
    st.textAlign = 'center';
    st.backgroundColor = 'rgba(28,28,28,0.9)';
    st.padding = '5px 9px';

    $('.ytp-tooltip-text').css('text-align', 'center');

    $('.ytp-tooltip-bg').before(title);
  },

  transitionMarker(id) {
    const markerLeft = document.getElementById('marker-' + id).getBoundingClientRect().left + window.scrollX;

    let submitLeft = document.getElementById('submitDiv').getBoundingClientRect().left + window.scrollX;

    submitLeft = submitLeft + 17 - markerLeft;

    const marker = document.getElementById('marker-' + id);
    marker.style.visibility = 'visible';

    $('.html5-video-player').css('position', 'static');
    $('.html5-video-player').css('contain', 'none');

    transition.begin(marker, [
      ['left', submitLeft + 'px', '-3px'],
      ['top', '118px', '0px'],
    ], {
      // Duration of 400ms is used both for opacity and transform
      duration: '2s',
      timingFunction: 'ease',
      onTransitionEnd(element, finished) {
        // if transition will be halted in the middle, finished will equal to false
        if (finished) {
          $('.html5-video-player').css('position', 'relative');
          $('.html5-video-player').css('contain', 'strict');
        }
      },
    });
  },

  addOption(input, id, time, owner) {
    // const time = Util.formatTime($('.html5-main-video')[0].currentTime)
    const seconds = Util.toSeconds(time);
    const option = document.createElement('OPTION');
    option.setAttribute('value', 'option-' + id);
    option.setAttribute('id', 'option-' + seconds);
    if (owner) {
      option.setAttribute('user_id', owner);
    } else {
      option.setAttribute('user_id', 'not_authorized');
    }
    const opt_text = document.createTextNode(time + ' - ' + input);
    option.appendChild(opt_text);
    $('#marker-select').append(option);
  },

  removeMarker(markerId) {
    // Remove option
    // $('#marker-select option:selected').remove()
    $('#marker-select option[value=option-' + markerId + ']').remove();
    $('#marker-select').val('default');

    // Remove marker and its hover child
    $('#marker-' + markerId).remove();

    // Remove marker-title
    $('#title-' + markerId).remove();
  },

  removeMarkers() {
    $('.markers').each(function () {
      $(this).remove();
    });
    $('#marker-select > option').each(function () {
      if ($(this).text() !== 'Jump to marker') {
        $(this).remove();
      }
    });
  },

  toggleMarkers(on) {
    if (on) {
      $('.markers').each(function () {
        $(this).show();
      });
    } else {
      $('.markers').each(function () {
        $(this).hide();
      });
    }
  },

  removeAdMarker(adMarkers) {
    for (let i = 0; i < adMarkers.length; i++) {
      adMarkers[i].remove();
    }
  },

  changeOption(e) {
    $('.markers').each(function () {
      // check if clicked point (taken from event) is inside element
      const mouseX = e.pageX;
      const mouseY = e.pageY;
      const offset = $(this).offset();
      const width = $(this).width();
      const height = $(this).height();

      if (
        mouseX > offset.left
        && mouseX < offset.left + width
        && mouseY > offset.top
        && mouseY < offset.top + height
      ) {
        const id = $(this)[0].id.replace('marker-', '');
        $('#marker-select').val('option-' + id);
        View.removeOrReportBtn();
      }
    });
  },

  removeOrReportBtn() {
    // Change delete button
    const selectedUserId = $('#marker-select').find('option:selected').attr('user_id');
    const removeSelected = $('#btnDelete').is(':visible');
    if (selectedUserId === user_id && !removeSelected) {
      $('#btnDelete').show();
      $('#deleteText').show();
      $('#btnReport').hide();
      $('#reportText').hide();
      $('#deleteDiv').css('margin-left', '5px');
    } else if (selectedUserId !== user_id && removeSelected) {
      $('#btnReport').show();
      $('#reportText').show();
      $('#btnDelete').hide();
      $('#deleteText').hide();
      $('#deleteDiv').css('margin-left', '3px');
    }
  },

  adjustMarker() {
    const adjustMutation = new MutationSummary({
      callback: adjust,
      queries: [{
        element: '.ytp-play-progress',
        elementAttributes: 'style',
      }],
    });

    function adjust(summaries) {
      adjustMutation.disconnect();
      const scaleX = summaries[0].attributeChanged.style[0].style.transform;

      let adjustedMarker = scaleX.match(/\d*\.\d*|\d/);

      adjustedMarker = (adjustedMarker * 100) + '%';

      const id = $('#marker-select option:selected').val().replace('option', 'marker');

      $('#' + id).css('margin-left', adjustedMarker);
    }
  },

  jumpTo(selected) {
    const time = selected.split(' - ')[0];

    const video = $('.html5-main-video');

    // Jump to marker
    video[0].currentTime = Util.toSeconds(time);
  },

  inputError(message) {
    $('#submitInput').removeClass('change');
    $('#submitInput').addClass('error');
    $('#marker-lowerCont').css('padding', '0px 15px 6px 15px');
    $('#inputError').text(message);
  },

  inputReset() {
    $('#submitInput').removeClass('change');
    $('#submitInput').removeClass('error');
    $('#submitInput').removeClass('has-value');
    $('#marker-lowerCont').css('padding', '0px 15px 19px 15px');
    $('#inputError').text('');
    $('#submitInput').val('');
  },

  inputResetFocus() {
    $('#submitInput').removeClass('change');
    $('#submitInput').removeClass('error');
    $('#marker-lowerCont').css('padding', '0px 15px 19px 15px');
    $('#inputError').text('');
  },

  onInputChange() {
    document.getElementById('submitInput').addEventListener('input', function () {
      if ($('#submitInput').css('color') === 'rgb(244, 67, 54)') {
        $('#submitInput').addClass('change');
      }
      View.inputResetFocus();
    });
  },

  removeOutput(message, opts) {
    $('#marker-lowerCont').css('padding', '5px 15px 2px 15px');
    $('#delMessage').text(message);
    if (opts && opts.success) {
      $('#delMessage').css('color', 'black');
    }
    setTimeout(() => {
      $('#delMessage').text('');
      $('#marker-lowerCont').css('padding', '0px 15px 19px 15px');
    }, 3000);
  },

  checkName(input) {
    if (input === 'jump to marker') return false;

    let valid = true;

    $('#marker-select > option').each(function () {
      if ($(this).text() !== 'Jump to marker') {
        const marker = $(this).text().split(' - ')[1];

        if (marker.toLowerCase() === input) {
          valid = false;
          return false;
        }
      }
      return true;
    });
    return valid;
  },

  checkTime() {
    let result = true;

    const percent = Util.getProgress();
    const parentWidth = parseInt($('.ytp-progress-list').css('width'), 10);
    const pixels = parentWidth * (percent / 100);

    $('.markers').each(function () {
      const markerPixels = parseInt($(this).css('margin-left').replace('px', ''), 10);

      if (pixels >= markerPixels - 7 && pixels <= markerPixels + 7) {
        result = false;
      }
    });

    return result;
  },

  checkNetwork() {
    const video = $('.html5-main-video');

    let result = false;

    if (video[0].readyState === 4) {
      result = true;
    }

    return result;
  },

  showControls() {
    const mClass = $('.html5-video-player').attr('class');

    // Only show controls if they are hidden
    if (mClass.indexOf('ytp-autohide') > -1) {
      const video = $('.html5-main-video');

      video.one('timeupdate', function () {
        $('#movie_player').toggleClass('ytp-autohide');
      });

      video.on('timeupdate', function () {
        onTimeUpdate(this);
      });

      video.on('progress', function () {
        onProgress(this);
      });

      $('.ytp-time-current').text(Util.formatTime(video[0].currentTime));

      const i = setInterval(function () {
        $('.ytp-time-current').text(Util.formatTime(video[0].currentTime));
      }, 1000);

      $(document).on('mouseenter', '#movie_player', function () {
        clearTimeout(timeout);
        video.off('timeupdate', onTimeUpdate);
        video.off('progress', onProgress);
        $(document).off('mouseenter', '#movie_player');
      });

      const timeout = setTimeout(function () {
        $('#movie_player').toggleClass('ytp-autohide');
        clearInterval(i);
        video.off('timeupdate', onTimeUpdate);
        video.off('progress', onProgress);
        $(document).off('mouseenter', '#movie_player');
      }, 3000);
    }
    function onTimeUpdate(thisVideo) {
      $('.ytp-play-progress').css('transform', 'scaleX(' + (thisVideo.currentTime / thisVideo.duration) + ')');
    }
    function onProgress(thisVideo) {
      $('.ytp-load-progress').css('transform', 'scaleX(' + (thisVideo.buffered.end(thisVideo.buffered.length - 1) / thisVideo.duration) + ')');
    }
  },

  disableElements() {
    document.getElementById('submitInput').disabled = true;
    document.getElementById('submitDiv').style.cursor = 'default';
    document.getElementById('marker-select').disabled = true;
    document.getElementById('marker-select').style.cursor = 'default';
    document.getElementById('marker-btnLeft').style.cursor = 'default';
    document.getElementById('marker-btnRight').style.cursor = 'default';
    document.getElementById('deleteDiv').style.cursor = 'default';
    document.getElementById('marker-cont').style.opacity = '.4';
    $('#submitDiv').addClass('disabled');
    $('#deleteDiv').addClass('disabled');

    $(document).off('mouseenter', '#submitDiv, #deleteDiv, #marker-btnLeft, #marker-btnRight')
      .off('mouseleave', '#submitDiv, #deleteDiv, #marker-btnLeft, #marker-btnRight');

    $('.rippleSelector').removeClass('ripple rippleSelectBtns');
    $('.rippleSelectSelector').removeClass('ripple rippleSelectBtns');
  },

  enableElements() {
    document.getElementById('submitInput').disabled = false;
    document.getElementById('submitDiv').style.cursor = 'pointer';
    document.getElementById('marker-select').disabled = false;
    document.getElementById('marker-select').style.cursor = 'pointer';
    document.getElementById('marker-btnLeft').style.cursor = 'pointer';
    document.getElementById('marker-btnRight').style.cursor = 'pointer';
    document.getElementById('deleteDiv').style.cursor = 'pointer';
    document.getElementById('marker-cont').style.opacity = 'initial';
    $('#submitDiv').removeClass('disabled');
    $('#deleteDiv').removeClass('disabled');

    $('.rippleSelector').addClass('ripple');
    $('.rippleSelectSelector').addClass('rippleSelectBtns');

    View.onBtnsHover();
  },
};

const Util = {

  inject() {
    const s = document.createElement('script');
    s.src = chrome.extension.getURL('content/inject.js');
    document.head.appendChild(s);
    s.onload = function () {
      s.parentNode.removeChild(s);
    };
  },

  formatTime(seconds) {
    let time;
    if (seconds >= 3600) {
      time = moment('1900-01-01 00:00:00').add(seconds, 'seconds').format('H:mm:ss');
    } else if (seconds >= 600) {
      time = moment('1900-01-01 00:00:00').add(seconds, 'seconds').format('mm:ss');
    } else {
      time = moment('1900-01-01 00:00:00').add(seconds, 'seconds').format('m:ss');
    }
    return time;
  },

  toSeconds(time) {
    let seconds;

    if (time.length < 6) {
      time = time.split(':');
      seconds = (+time[0]) * 60 + (+time[1]);
    } else if (time.length < 10) {
      time = time.split(':');
      seconds = (+time[0]) * 60 * 60 + (+time[1]) * 60 + (+time[2]);
    } else {
      seconds = 86400;
    }
    return seconds;
  },

  sortList(opts) {
    if (!opts) opts = {};

    if (document.getElementById('marker-select').length > 1) {
      const selected = $('#marker-select').val();

      opts.selectOption = opts.selectOption !== false;

      $('#marker-select option[value=default]').remove();

      const selectOptions = $('#marker-select option');

      selectOptions.sort(compareNumbers);

      $('#marker-select').empty().append(selectOptions);

      $('<option value=default>Jump to marker</option>').insertBefore($('#marker-select').find('option:eq(0)'));

      if (opts.option && opts.selectOption) {
        $('#marker-select').val(opts.option);
      } else {
        $('#marker-select').val(selected);
      }
      View.removeOrReportBtn();
    }
    function compareNumbers(a, b) {
      return parseInt(a.id.split('-')[1], 10) - parseInt(b.id.split('-')[1], 10);
    }
  },

  getProgress() {
    const video = $('.html5-main-video');

    const percentage = (video[0].currentTime / video[0].duration) * 100;

    return percentage;
  },

  duplicateID() {
    $('[id]').each(function () {
      const ids = $('[id="' + this.id + '"]');
      if (ids.length > 1 && ids[0] === this) {
        console.log('Multiple IDs #' + this.id);
      }
    });
  },
};

let observer;

function init() {
  // Check if all needed elements are loaded

  /* let html5Attr = true;
  let clarify = true;
  let top = true;
  let scrubber = true;
  let progress = true;
  let html5 = true;
  let info = true; */

  /* if ($('.html5-main-video').attr('src')) {
    if (html5Attr) console.log('html5-main-video');
    html5Attr = false;
  }
  if ($('#clarify-box').length) {
    if (clarify) console.log('#clarify-box');
    clarify = false;
  }
  if ($('#top').length) {
    if (top) console.log('#top');
    top = false;
  }
  if ($('.ytp-scrubber-container').length) {
    if (scrubber) console.log('.ytp-scrubber-container');
    scrubber = false;
  }
  if ($('.ytp-progress-list').length) {
    if (progress) console.log('.ytp-progress-list');
    progress = false;
  }
  if ($('.html5-main-video').length) {
    if (html5) console.log('.html5-main-video');
    html5 = false;
  }
  if ($('#info.ytd-watch').length) {
    if (info) console.log('#info.ytd-watch');
    info = false;
  } */
  if (
    $('.html5-main-video').attr('src')
    && $('#clarify-box').length
    && $('.ytp-scrubber-container').length
    && $('.ytp-progress-list').length
    && $('.html5-main-video').length
    && $('#movie_player').length
  ) {
    // Disconnect observer
    observer.disconnect();
    // Initialize content and events
    Environment.init(() => {
      View.init();
      YouMarkAPI.getMarkers();
      View.onAdd();
      View.onSelectChange();
      View.onNavBtns();
      View.onRemove();
      View.onMarkerClick();
      View.onMarkerHover();
      View.onBtnsHover();
      View.onInputFocus();
      View.onWindowResize();
      View.onCommercial();
      View.onLive();
      View.onMarkerAd();
      View.onVideoChange();
      View.onTimeUpdate();
      View.onInputChange();
      Socket.initSocket();

      console.log('done initializing');
    });
  }
}

$(document).ready(() => {
  console.log('initializing');

  // Listen for elements getting added async by YouTube
  observer = new MutationSummary({
    callback: init,
    queries: [{
      all: true,
    }],
  });
});
