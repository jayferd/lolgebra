$(function()
{
  var chatbox = $('#chatbox'), lastId, untilId;

  function appendMsg(msg) //to chatbox, like when recieving new msg
  {
    var wasAtBottom = (chatbox[0].scrollHeight - chatbox.scrollTop() <= chatbox.outerHeight()+15),
      msg = $('<p><b>'+msg.name+':</b> '+decodeURIComponent(msg.message)+'</p>');
    chatbox.append(msg);
    if(wasAtBottom)
       chatbox.scrollTop(chatbox[0].scrollHeight);
    return msg;
  }

  //on scroll chatbox
  var gettingOlder = false;
  function getOlder()
  {
    if(gettingOlder || untilId <= 0 || chatbox.scrollTop() > 200)
      return;
    gettingOlder = true;
    var end = untilId - 1;
    untilId = (untilId <= 10 ? 0 : untilId - 10);
    $.getJSON('/chat/'+ROOM+'/messages', { start: untilId, end: end },
      function(response)
    {
      var msgs = '';
      $.each(response.messages, function(i, msg)
      {
        msgs+='<p><b>'+msg.name+':</b> '+decodeURIComponent(msg.message)+'</p>';
      });
      msgs = $(msgs);
      var scrollTop = chatbox.scrollTop(), height = 0;
      msgs.prependTo(chatbox).each(function(){
        height += $(this).outerHeight(true);
      });
      chatbox.scrollTop(scrollTop + height);
      gettingOlder = false;
    });
  }

  //first request to get latest 20 messages
  $.getJSON('/chat/'+ROOM+'/messages', { start: -20, end: -1 }, function(response)
  {
    if(!response || !response.status)
    {
      $('#loading').text('Oops, sorry, there was a problem loading messages.');
      return;
    }
    $('#loading').remove();
    lastId = +response.last_id;
    untilId = lastId - 19;
    for(var i in response.messages)
      appendMsg(response.messages[i]);

    //now that the first request went through, all the initialization code
    chatbox.scroll(getOlder);
    var faye = new Faye.Client('/faye', {timeout: 120}), myOwnMsgs = [];
    faye.subscribe('/'+ROOM, function(msg)
    {
      for(var i = 0, str = msg.name+':'+msg.message; i < myOwnMsgs.length; i += 1)
        if(myOwnMsgs[i] && myOwnMsgs[i].str === str)
        {
          myOwnMsgs[i].jQ.css('color','black');
          delete myOwnMsgs[i];
          while(myOwnMsgs.length && !myOwnMsgs[myOwnMsgs.length - 1])
            myOwnMsgs.length -= 1;
          return;
        }
      appendMsg(msg);
    });
    var preventDefault;
    $('.mathquill-textbox').keydown(function(e)
    {
      var jQ = $(this);
      if(e.which === 13 && !e.shiftKey && !(e.ctrlKey || e.metaKey) &&
          jQ.children(':not(.textarea,.cursor):first').length) //ensure nonempty
      {
        preventDefault = true;
        var msg = {};
        msg.name = USERNAME || prompt('What\'s your name?','Nameless Lady in the Hood');
        if(!msg.name) return;
        msg.message = encodeURIComponent(jQ.blur().mathquill('html'));
        myOwnMsgs[myOwnMsgs.length] = {
          str: msg.name+':'+msg.message,
          jQ: appendMsg(msg).css('color','#445')
        };
        $.post('/chat/'+ROOM+'/message', msg, function()
        {
          if(!USERNAME && msg.name)
            location = location.pathname + '?name=' + msg.name;
        });
        jQ.mathquill('latex','').focus(); //empty and focus
      }
    }).focus();
  });
});
