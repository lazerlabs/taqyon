#ifndef MYWEBVIEW_H
#define MYWEBVIEW_H

#include <QWebEngineView>

class MyWebView : public QWebEngineView {
    Q_OBJECT
public:
    explicit MyWebView(QWidget *parent = nullptr);
};

#endif // MYWEBVIEW_H

