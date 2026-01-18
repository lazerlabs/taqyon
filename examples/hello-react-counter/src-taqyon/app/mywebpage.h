#ifndef MYWEBPAGE_H
#define MYWEBPAGE_H

#include <QWebEnginePage>

class MyWebPage : public QWebEnginePage {
    Q_OBJECT
public:
    explicit MyWebPage(QWebEngineProfile *profile, QObject *parent = nullptr);
};

#endif // MYWEBPAGE_H

