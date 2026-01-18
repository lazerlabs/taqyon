#ifndef MYWEBVIEW_H
#define MYWEBVIEW_H

#include <QWebEnginePage>    // Ensure QWebEnginePage is fully defined early
#include <QWebEngineView>
#include <QContextMenuEvent>

class MyWebView : public QWebEngineView
{
    Q_OBJECT

public:
    explicit MyWebView(QWidget *parent = nullptr);

protected:
    void contextMenuEvent(QContextMenuEvent *event) override;
    QWebEngineView *createWindow(QWebEnginePage::WebWindowType type) override;
};

#endif // MYWEBVIEW_H 