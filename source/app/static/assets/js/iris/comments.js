var g_comment_desc_editor = null;
function comment_event(element_id, element_type) {
    var url = `/case/${element_type}/${element_id}/comments/modal`;
    $('#modal_comment_content').load(url + case_param(),
        function (response, status, xhr) {
            if (status !== "success") {
                 ajax_notify_error(xhr, url);
                 return false;
            }
            $('#modal_comment_content').resizable({
                alsoResize: ".modal-dialog",
                minHeight: 300,
                minWidth: 300,
                handles: "n, e, s, w, ne, se, sw, nw"
            });
            $('.modal-comment').draggable({
                cursor: 'move'
            });

            $('#modal_comment').modal('show');

            g_comment_desc_editor = get_new_ace_editor('comment_message', 'comment_content', 'target_comment_content',
                        function() {
                            $('#last_saved').addClass('btn-danger').removeClass('btn-success');
                            $('#last_saved > i').attr('class', "fa-solid fa-file-circle-exclamation");
                            $('#submit_new_ioc').text("Unsaved").removeClass('btn-success').addClass('btn-outline-warning').removeClass('btn-outline-danger');
                        }, undefined, false, false);

            headers = get_editor_headers('g_comment_desc_editor', null, 'comment_edition_btn');
            $('#comment_edition_btn').append(headers);

            load_comments(element_id, element_type);
        }
    );
}

function preview_comment() {
    if(!$('#container_comment_preview').is(':visible')) {
        comment_text = g_comment_desc_editor.getValue();
        converter = new showdown.Converter({
            tables: true,
            parseImgDimensions: true
        });
        html = converter.makeHtml(comment_text);
        comment_html = filterXSS(html);
        $('#target_comment_content').html(comment_html);
        $('#container_comment_preview').show();
        $('#comment_preview_button').html('<i class="fa-solid fa-eye-slash"></i> Edit');
        $('#container_comment_content').hide();
    }
    else {
        $('#container_comment_preview').hide();
        $('#comment_preview_button').html('<i class="fa-solid fa-eye"></i> Preview');
        $('#container_comment_content').show();
    }
}

function save_comment(element_id, element_type) {
    save_comment_ext(element_id, element_type, false);
}

function save_comment_ext(element_id, element_type, do_close){
    data = Object();
    data['comment_text'] = g_comment_desc_editor.getValue();
    data['csrf_token'] = $('#csrf_token').val();
    post_request_api(`/case/${element_type}/${event_id}/comments/add`, JSON.stringify(data), true)
    .done((data) => {
        if(notify_auto_api(data)) {
            load_comments(element_id, element_type);
        }
    });
}

function delete_comment(comment_id, element_id, element_type) {
    do_deletion_prompt("You are about to delete comment #" + comment_id)
    .then((doDelete) => {
        if (doDelete) {
            data = Object();
            data['csrf_token'] = $('#csrf_token').val();
            get_request_api(`/case/${element_type}/${element_id}/comments/${comment_id}/delete`)
            .done((data) => {
                if(notify_auto_api(data)) {
                    load_comments(element_id, element_type);
                }
            });
        }
    });
}

function edit_comment(comment_id, element_id, element_type) {

    get_request_api(`/case/${element_type}/${element_id}/comments/${comment_id}`)
    .done((data) => {
        if(notify_auto_api(data, true)) {

            $('#comment_'+comment_id).css('background-color','rgba(255, 167, 90, 0.44)');
            $('#comment_'+comment_id).css('border-radius','20px');
            $('#comment_'+comment_id).addClass('comment_editing');
            $('#comment_'+comment_id).data('comment_id', comment_id);
            g_comment_desc_editor.setValue(data.data.comment_text);
            $('#comment_edition').show();
            $('#comment_submit').hide();
            $('#cancel_edition').show();

        }
    });

}

function save_edit_comment(element_id, element_type) {
    data = Object();
    data['comment_text'] = g_comment_desc_editor.getValue();
    comment_id = $('.comment_editing').data('comment_id');
    data['csrf_token'] = $('#csrf_token').val();
    post_request_api(`/case/${element_type}/${element_id}/comments/${comment_id}/edit`, JSON.stringify(data), true)
    .done((data) => {
        if(notify_auto_api(data)) {
            cancel_edition(comment_id);
            load_comments(element_id, element_type, comment_id);
        }
    });
}

function cancel_edition(comment_id) {
    $('.comment_editing').css('background-color', '');
    $('.comment_editing').css('border-radius', '');
    $('.comment_editing').removeClass('comment_editing');
    $('.comment_editing').data('comment_id', '');
    $('#comment_edition').hide();
    $('#cancel_edition').hide();
    $('#comment_submit').show();
    g_comment_desc_editor.setValue('');
}

function load_comments(element_id, element_type, comment_id) {
    get_request_api(`/case/${element_type}/${element_id}/comments/list`, true)
    .done((data) => {
        if (notify_auto_api(data, true)) {
            $('#comments_list').empty();
            var names = Object;
            for (var i = 0; i < data['data'].length; i++) {

                comment_text = data['data'][i].comment_text;
                converter = new showdown.Converter({
                    tables: true,
                    parseImgDimensions: true
                });
                html = converter.makeHtml(comment_text);
                comment_html = filterXSS(html);
                if (names.hasOwnProperty(data['data'][i].name)) {
                    avatar = names[data['data'][i].name];
                } else {
                    avatar = get_avatar_initials(data['data'][i].name);
                    names[data['data'][i].name] = avatar;
                }

                is_last_one = "";
                if (i == data['data'].length - 1) {
                    is_last_one = "last-comment";
                }

                can_edit = "";
                current_user = $('#current_username').text();

                if (current_user === data['data'][i].user) {
                    can_edit = '<a href="#" class="btn btn-sm comment-edition-hidden" title="Edit comment" onclick="edit_comment(\'' + data['data'][i].comment_id + '\', \'' + element_id + '\',\''+ element_type +'\'); return false;"><i class="fa-solid fa-edit text-dark"></i></a>';
                    can_edit += '<a href="#" class="btn btn-sm comment-edition-hidden" title="Delete comment" onclick="delete_comment(\'' + data['data'][i].comment_id + '\', \'' + element_id + '\',\''+ element_type +'\'); return false;"><i class="fa-solid fa-trash text-dark"></i></a>';
                }

                comment = `
                    <div class="row mb-2 mr-1 ${is_last_one}" >
                        <div class="col-12" id="comment_${data['data'][i].comment_id}">
                            <div class="row mt-2">
                                <div class="col-5">
                                    <div class="ml-2 row">
                                        ${avatar}
                                         <div class="ml-3 mt-1">
                                            <h6 class="text-uppercase fw-bold mb-1">${data['data'][i].name}</h6>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-7">
                                    <div class="float-right">
                                        ${can_edit} <small class="text-muted text-wrap">${data['data'][i].comment_date}</small>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-11 ml-4">
                                    <span class="text-muted">${comment_html}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                $('#comments_list').append(comment);
            }
            if (data['data'].length === 0) {
                $('#comments_list').html('<div class="text-center">No comments yet</div>');
            } else if (comment_id === undefined) {
                $('#comments_list').animate({ scrollTop: $('.last-comment').offset().top});
            } else {
                $('#comments_list').animate({ scrollTop: ($('#comment_'+comment_id).offset().top)});
            }
        }
    });
}