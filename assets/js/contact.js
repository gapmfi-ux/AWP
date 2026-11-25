function switchContactTab(tabName) {
  const contactModule = document.getElementById('contactModule');
  if (!contactModule) return;

  const isStaff = tabName === 'staff';

  contactModule.querySelector('#staffContactTab').classList.toggle('active', isStaff);
  contactModule.querySelector('#thirdPartyContactTab').classList.toggle('active', !isStaff);
  contactModule.querySelector('#staffTabButton').classList.toggle('active', isStaff);
  contactModule.querySelector('#thirdPartyTabButton').classList.toggle('active', !isStaff);

  contactModule.querySelector('#staffTabButton').setAttribute('aria-selected', String(isStaff));
  contactModule.querySelector('#thirdPartyTabButton').setAttribute('aria-selected', String(!isStaff));
}

window.switchContactTab = switchContactTab;
window.initContactModule = function() {
  switchContactTab('staff');
};
