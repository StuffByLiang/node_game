//set cookies if not set yet
if(Cookies.get('q') == undefined) {
  Cookies.set('team', "blue");
  Cookies.set('q', "bullet");
  Cookies.set('w', "freeze");
  Cookies.set('e', "flash");
  Cookies.set('r', "rocket");
} else {
  $('#team').val(Cookies.get('team'));
  $('#q').val(Cookies.get('q'));
  $('#w').val(Cookies.get('w'));
  $('#e').val(Cookies.get('e'));
  $('#r').val(Cookies.get('r'));
}

$('#current-selection').html("Team:" + Cookies.get('team') +"Q: " + Cookies.get('q') + " W: " + Cookies.get('w') + " E: " + Cookies.get('e') + " R: " + Cookies.get('r') );


function save() {
  Cookies.set('team', $('#team').val());
  Cookies.set('q', $('#q').val());
  Cookies.set('w', $('#w').val());
  Cookies.set('e', $('#e').val());
  Cookies.set('r', $('#r').val());

  $('#current-selection').html("Team:" + Cookies.get('team') +"Q: " + Cookies.get('q') + " W: " + Cookies.get('w') + " E: " + Cookies.get('e') + " R: " + Cookies.get('r') );
}
