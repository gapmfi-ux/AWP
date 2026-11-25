(function() {
  'use strict';

  let activeContactType = 'STAFF';

  const CONTACT_FORMS = {
    STAFF: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'officeMobileNumber', label: 'Office Mobile Number', type: 'tel' },
      { key: 'officeEmail', label: 'Office Email', type: 'email' },
      { key: 'personalMobileNumber', label: 'Personal Mobile Number', type: 'tel' },
      { key: 'personalEmail', label: 'Personal Email', type: 'email' }
    ],
    'THIRD-PARTY': [
      { key: 'institutionIndividualName', label: 'Institution/Individual Name', type: 'text' },
      { key: 'natureOfBusiness', label: 'Nature of business', type: 'text' },
      { key: 'contactPersonName', label: 'Contact person name', type: 'text' },
      { key: 'contactNumber', label: 'Contact Number', type: 'tel' },
      { key: 'email', label: 'Email', type: 'email' }
    ]
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function getModule() {
    return document.getElementById('contactModule');
  }

  function initContactModule() {
    activeContactType = 'STAFF';
    switchContactTab('STAFF');
  }

  function switchContactTab(type) {
    const module = getModule();
    if (!module) return;

    activeContactType = type === 'THIRD-PARTY' ? 'THIRD-PARTY' : 'STAFF';

    const isStaff = activeContactType === 'STAFF';
    module.querySelector('#staffContactTab').classList.toggle('active', isStaff);
    module.querySelector('#thirdPartyContactTab').classList.toggle('active', !isStaff);
    module.querySelector('#staffTabButton').classList.toggle('active', isStaff);
    module.querySelector('#thirdPartyTabButton').classList.toggle('active', !isStaff);
    module.querySelector('#staffTabButton').setAttribute('aria-selected', String(isStaff));
    module.querySelector('#thirdPartyTabButton').setAttribute('aria-selected', String(!isStaff));

    loadContactRecords(activeContactType);
  }

  async function loadContactRecords(type) {
    const module = getModule();
    if (!module || !window.API) return;

    const isStaff = type === 'STAFF';
    const tbody = module.querySelector(isStaff ? '#staffContactsBody' : '#thirdPartyContactsBody');
    if (!tbody) return;

    const columnCount = isStaff ? 7 : 6;
    tbody.innerHTML = '<tr><td colspan="' + columnCount + '" class="contact-empty">Loading contacts…</td></tr>';

    try {
      const response = await API.request(
        'getContactRecords',
        { type: type },
        { useCache: false }
      );

      if (!response || response.success === false) {
        throw new Error((response && response.error) || 'Unable to load contacts.');
      }

      const records = Array.isArray(response.records) ? response.records : [];
      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + columnCount + '" class="contact-empty">No contacts have been added yet.</td></tr>';
        return;
      }

      tbody.innerHTML = records.map(function(record) {
        const cells = isStaff
          ? [
              record.cNo,
              record.name,
              record.designation,
              record.officeMobileNumber,
              record.officeEmail,
              record.personalMobileNumber,
              record.personalEmail
            ]
          : [
              record.cNo,
              record.institutionIndividualName,
              record.natureOfBusiness,
              record.contactPersonName,
              record.contactNumber,
              record.email
            ];

        return '<tr>' + cells.map(function(value) {
          return '<td>' + escapeHtml(value) + '</td>';
        }).join('') + '</tr>';
      }).join('');
    } catch (error) {
      console.error('Error loading contacts:', error);
      tbody.innerHTML =
        '<tr><td colspan="' + columnCount + '" class="contact-empty">' +
        escapeHtml(error.message || 'Unable to load contacts.') +
        '</td></tr>';
    }
  }

  function openAddContact() {
    const module = getModule();
    if (!module) return;

    const modal = module.querySelector('#contactModal');
    const fieldsContainer = module.querySelector('#contactFormFields');
    const title = module.querySelector('#contactModalTitle');
    const form = module.querySelector('#contactForm');
    const error = module.querySelector('#contactFormError');

    title.textContent = activeContactType === 'STAFF'
      ? 'Add Staff Contact'
      : 'Add Third Party Contact';

    error.textContent = '';
    form.reset();

    fieldsContainer.innerHTML = CONTACT_FORMS[activeContactType].map(function(field) {
      const fullWidth = field.type === 'email' ? ' full-width' : '';
      return (
        '<div class="contact-form-field' + fullWidth + '">' +
          '<label for="contact-' + field.key + '">' + escapeHtml(field.label) + '</label>' +
          '<input id="contact-' + field.key + '"' +
            ' name="' + field.key + '"' +
            ' type="' + field.type + '"' +
            ' autocomplete="off" required>' +
        '</div>'
      );
    }).join('');

    modal.hidden = false;
    const firstInput = fieldsContainer.querySelector('input');
    if (firstInput) firstInput.focus();
  }

  function closeAddContact() {
    const module = getModule();
    if (!module) return;

    const modal = module.querySelector('#contactModal');
    if (modal) modal.hidden = true;
  }

  async function submitContactForm(event) {
    event.preventDefault();

    const module = getModule();
    if (!module || !window.API) return;

    const form = module.querySelector('#contactForm');
    const errorElement = module.querySelector('#contactFormError');
    const saveButton = module.querySelector('#contactSaveButton');

    errorElement.textContent = '';

    if (!form.reportValidity()) return;

    const payload = { type: activeContactType };
    CONTACT_FORMS[activeContactType].forEach(function(field) {
      const input = form.elements[field.key];
      payload[field.key] = input ? input.value.trim() : '';
    });

    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

    try {
      const response = await API.request(
        'addContactRecord',
        payload,
        { useCache: false }
      );

      if (!response || response.success === false) {
        throw new Error((response && response.error) || 'Unable to save contact.');
      }

      closeAddContact();
      await loadContactRecords(activeContactType);
    } catch (error) {
      console.error('Error saving contact:', error);
      errorElement.textContent = error.message || 'Unable to save contact.';
    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = '<i class="fas fa-save"></i> Save Contact';
    }
  }

  window.initContactModule = initContactModule;
  window.switchContactTab = switchContactTab;
  window.openAddContact = openAddContact;
  window.closeAddContact = closeAddContact;
  window.submitContactForm = submitContactForm;
})();
