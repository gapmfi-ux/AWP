(function() {
  'use strict';

  let activeContactType = 'STAFF';
  let editingContactCNo = null;
  let contactRecords = [];

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
    editingContactCNo = null;
    switchContactTab('STAFF');
  }

  function switchContactTab(type) {
    const module = getModule();
    if (!module) return;

    activeContactType = type === 'THIRD-PARTY' ? 'THIRD-PARTY' : 'STAFF';
    editingContactCNo = null;

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

    const columnCount = isStaff ? 8 : 7;
    tbody.innerHTML =
      '<tr><td colspan="' + columnCount + '" class="contact-empty">Loading contacts…</td></tr>';

    try {
      const response = await API.request(
        'getContactRecords',
        { type: type },
        { useCache: false }
      );

      if (!response || response.success === false) {
        throw new Error((response && response.error) || 'Unable to load contacts.');
      }

      contactRecords = Array.isArray(response.records) ? response.records : [];

      if (contactRecords.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="' + columnCount +
          '" class="contact-empty">No contacts have been added yet.</td></tr>';
        return;
      }

      tbody.innerHTML = contactRecords.map(function(record) {
        let cells;

        if (isStaff) {
          cells = [
            record.cNo,
            record.name,
            record.designation,
            record.officeMobileNumber,
            record.officeEmail,
            record.personalMobileNumber,
            record.personalEmail
          ];
        } else {
          cells = [
            record.cNo,
            record.institutionIndividualName,
            record.natureOfBusiness,
            record.contactPersonName,
            record.contactNumber,
            record.email
          ];
        }

        let html = '<tr>';

        html += cells.map(function(value) {
          return '<td>' + escapeHtml(value) + '</td>';
        }).join('');

        html +=
          '<td class="contact-row-actions">' +
            '<button type="button" class="contact-action-btn contact-edit-btn" ' +
              'title="Edit" aria-label="Edit ' + escapeHtml(record.cNo) + '" ' +
              'onclick="openEditContact(' + JSON.stringify(record.cNo).replace(/"/g, '&quot;') + ')">' +
              '<i class="fas fa-edit"></i>' +
            '</button>' +
            '<button type="button" class="contact-action-btn contact-delete-btn" ' +
              'title="Remove" aria-label="Remove ' + escapeHtml(record.cNo) + '" ' +
              'onclick="deleteContact(' + JSON.stringify(record.cNo).replace(/"/g, '&quot;') + ')">' +
              '<i class="fas fa-trash"></i>' +
            '</button>' +
          '</td>';

        html += '</tr>';
        return html;
      }).join('');
    } catch (error) {
      console.error('Error loading contacts:', error);
      tbody.innerHTML =
        '<tr><td colspan="' + columnCount +
        '" class="contact-empty">' +
        escapeHtml(error.message || 'Unable to load contacts.') +
        '</td></tr>';
    }
  }

  function openAddContact() {
    const module = getModule();
    if (!module) return;

    editingContactCNo = null;

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
      const fullWidth = (
        field.key === 'officeEmail' ||
        field.key === 'personalEmail' ||
        field.key === 'institutionIndividualName'
      ) ? ' full-width' : '';

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

  function openEditContact(cNo) {
    const module = getModule();
    if (!module) return;

    const record = contactRecords.find(function(item) {
      return item.cNo === cNo;
    });

    if (!record) {
      alert('Contact not found.');
      return;
    }

    const modal = module.querySelector('#contactModal');
    const fieldsContainer = module.querySelector('#contactFormFields');
    const title = module.querySelector('#contactModalTitle');
    const form = module.querySelector('#contactForm');
    const error = module.querySelector('#contactFormError');

    editingContactCNo = cNo;
    error.textContent = '';
    form.reset();

    title.textContent = activeContactType === 'STAFF'
      ? 'Edit Staff Contact'
      : 'Edit Third Party Contact';

    fieldsContainer.innerHTML = CONTACT_FORMS[activeContactType].map(function(field) {
      const fullWidth = (
        field.key === 'officeEmail' ||
        field.key === 'personalEmail' ||
        field.key === 'institutionIndividualName'
      ) ? ' full-width' : '';

      return (
        '<div class="contact-form-field' + fullWidth + '">' +
          '<label for="contact-' + field.key + '">' + escapeHtml(field.label) + '</label>' +
          '<input id="contact-' + field.key + '"' +
            ' name="' + field.key + '"' +
            ' type="' + field.type + '"' +
            ' autocomplete="off"' +
            ' value="' + escapeHtml(record[field.key]) + '" required>' +
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

    if (editingContactCNo) {
      payload.cNo = editingContactCNo;
    }

    CONTACT_FORMS[activeContactType].forEach(function(field) {
      const input = form.elements[field.key];
      payload[field.key] = input ? input.value.trim() : '';
    });

    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

    try {
      const action = editingContactCNo
        ? 'updateContactRecord'
        : 'addContactRecord';

      const response = await API.request(
        action,
        payload,
        { useCache: false }
      );

      if (!response || response.success === false) {
        throw new Error((response && response.error) || 'Unable to save contact.');
      }

      closeAddContact();
      editingContactCNo = null;
      await loadContactRecords(activeContactType);
    } catch (error) {
      console.error('Error saving contact:', error);
      errorElement.textContent = error.message || 'Unable to save contact.';
    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = '<i class="fas fa-save"></i> Save Contact';
    }
  }

  async function deleteContact(cNo) {
    if (!window.API) return;

    if (!confirm('Remove contact ' + cNo + '?')) return;

    try {
      const response = await API.request(
        'deleteContactRecord',
        {
          type: activeContactType,
          cNo: cNo
        },
        { useCache: false }
      );

      if (!response || response.success === false) {
        throw new Error((response && response.error) || 'Unable to remove contact.');
      }

      await loadContactRecords(activeContactType);
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert(error.message || 'Unable to remove contact.');
    }
  }

  window.initContactModule = initContactModule;
  window.switchContactTab = switchContactTab;
  window.openAddContact = openAddContact;
  window.openEditContact = openEditContact;
  window.closeAddContact = closeAddContact;
  window.submitContactForm = submitContactForm;
  window.deleteContact = deleteContact;
})();
